import {Requestor} from 'requestor/requestor';
import {ObjectStoreAbstract, ObjTable, GetItemsParams} from './object-store';
import {ObjectFactory, ObjDesc, ValueType, isObjectType} from '../object-factory';
import {DBPromise} from '../../common/db-promise';
import {Database} from 'sqlite3';
import {Queue} from '../../common/promise';

export {
  ObjTable
};

const OBJ_TABLE = 'ObjTable';
const OBJ_LISTS = 'ObjLists';
function createSpecTables() {
  const objTable = [
    `CREATE TABLE IF NOT EXISTS ${OBJ_TABLE}(`,
    '  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,',
    '  type TEXT,', // object, list, ...
    '  subtype TEXT,', // 
    '  createTime TIMEDATE DEFAULT CURRENT_TIMESTAMP',
    ')'
  ].join('\n');

  const objLists = [
    `CREATE TABLE IF NOT EXISTS ${OBJ_LISTS}(`,
    '  idx INTEGER,',
    '  listId INTEGER NOT NULL,',
    '  itemId INTEGER',
    ')'
  ].join('\n');

  return [objTable, objLists];
}

function createTable(desc: ObjDesc) {
  const typeTrans = {
    [ValueType.string]: 'TEXT',
    [ValueType.number]: 'REAL',
    [ValueType.integer]: 'INTEGER'
  };

  const columns = Object.keys(desc.objects).map(key => {
    const type = desc.objects[key];
    if (isObjectType(type)) {
      return `   ${key} INTEGER`;
    } else {
      return `   ${key} ${typeTrans[type]}`;
    }
  });

  return [
    `CREATE TABLE IF NOT EXISTS ${desc.classId}(`,
    [`   id INTEGER NOT NULL PRIMARY KEY UNIQUE`].concat(columns).join(',\n'),
    ')'
  ].join('\n');
}

export class SQLObjectStore extends ObjectStoreAbstract {
  private db: DBPromise;

  private constructor(factory: ObjectFactory, db: Database) {
    super(factory);
    this.db = new DBPromise(db);
  }

  setLog(ok: boolean) {
    this.db.setLog(ok);
  }

  static create(factory: ObjectFactory, file: string): Promise<SQLObjectStore> {
    const tables = createSpecTables();
    factory.getClasses().forEach(name => {
      const desc = factory.get(name);
      tables.push(createTable(desc));
    });
    
    let store: SQLObjectStore;
    return Queue.all(
      () => new Promise((resolve, reject) => {
        const db = new Database(file, (err) => {
          !err && resolve(db);
          err && reject(err);
        });
      }),
      db => store = new SQLObjectStore(factory, db),
      ...tables.map(s => () => {
        return store.db.execSQL(s);
      })
    ).then(() => store).catch(err => console.log(err));
  }

  findObject(id: string) {
    let objType: ObjTable;
    return Queue.lastResult(
      () => this.db.get(OBJ_TABLE, {cond: {id}}),
      (obj: ObjTable) => {
        if (!obj)
          throw `object id=${id} not found`;
        objType = obj;
        return this.db.get(obj.subtype, {cond: {id}});
      },
      (json) => {
        return {_: objType, ...json};
      }
    );
  }

  createObject(subtype: string): Promise<ObjTable> {
    let objType: ObjTable;
    return Queue.lastResult(
      () => this.db.insertAndGet({type: 'object', subtype}, OBJ_TABLE),
      (obj: ObjTable) => {
        objType = obj;
        objType.id = '' + objType.id;
        return this.db.insertAndGet({id: obj.id}, subtype);
      },
      () => objType
    );
  }

  write(id: string, json: Object): Promise<Object> {
    return Queue.lastResult(
      () => this.db.get(OBJ_TABLE, {cond: {id}}),
      (obj: ObjTable) => this.db.update(json, obj.subtype, {id: obj.id})
    );
  }

  writeArray(id: string, arr: Array<string>): Promise<Array<string>> {
    return Queue.lastResult(
      () => this.db.getSQL(`SELECT COUNT(*) as count FROM ${OBJ_LISTS} WHERE listId=${id}`),
      (data: {count: number}) => {
        const diff = data.count - arr.length;
        if (diff < 0) {
          let insertArr = [];
          while (insertArr.length < Math.abs(diff))
            insertArr.push({listId: id, idx: arr.length - insertArr.length + diff});
          return this.db.insertAll(insertArr, OBJ_LISTS);
        }
      },
      () => this.db.update({removed: 1}, OBJ_LISTS, {listId: id}),
      () => this.db.updateAll(arr.map(s => ({removed: 0, itemId: s})), OBJ_LISTS, {listId: id})
    );
  }

  appendToList(listId: string, objId: string, idx?: number) {
    let count = 0;
    return Queue.lastResult(
      () => this.db.getSQL(`SELECT COUNT(*) as count FROM ${OBJ_LISTS} WHERE listId=${listId} AND itemId notnull`),
      (res: {count: number}) => {
        count = res.count;
        if (idx == null)
          idx = count;
        else
          idx = Math.min(Math.max(0, idx), count);
        return this.db.execSQL(`UPDATE ${OBJ_LISTS} SET idx=idx+1 WHERE listId=${listId} AND itemId notnull AND idx >= ${idx}`);
      },
      () => this.db.getSQL(`SELECT rowid FROM ${OBJ_LISTS} WHERE listId=${listId} AND itemId isnull`),
      (data: {rowid: number}) => {
        if (data)
          return this.db.update({idx, itemId: objId}, OBJ_LISTS, {rowid: data.rowid});
        else
          return this.db.insert({listId, itemId: objId, idx}, OBJ_LISTS);
      },
      () => this.getObjectsFromList(listId)
    );
  }

  removeFromList(listId: string, idx: number) {
    return Queue.lastResult(
      () => this.db.execSQL(`UPDATE ${OBJ_LISTS} SET idx=null, itemId=null WHERE listId=${listId} AND idx=${idx}`),
      () => this.db.execSQL(`UPDATE ${OBJ_LISTS} SET idx=idx-1 WHERE listId=${listId} AND itemId notnull AND idx > ${idx}`),
      () => this.getObjectsFromList(listId)
    );
  }

  getObjectsFromList(listId: string, params?: GetItemsParams): Promise<Array<string>> {
    let offsLimit = '';
    if (params && params.from)
      offsLimit = 'OFFSET ' + params.from;
    if (params && params.count)
      offsLimit += ' LIMIT ' + params.count;

    return Queue.lastResult(
      () => this.db.getSQLAll(`SELECT itemId FROM ${OBJ_LISTS} WHERE listId=${listId} AND itemId notnull ORDER BY idx ASC ${offsLimit}`),
      (items: Array<{itemId: string}>) => items.map(item => '' + item.itemId)
    );
  }

  getListSize(listId: string): Promise<number> {
    return Queue.lastResult(
      () => this.db.getSQL(`SELECT COUNT(*) as count FROM ${OBJ_LISTS} WHERE listId=${listId} AND itemId notnull`),
      (res: {count: number}) => res.count
    );
  }

  createList(): Promise<ObjTable> {
    return this.db.insertAndGet({type: 'object', subtype: 'ListObj'}, OBJ_TABLE);
  }
}
