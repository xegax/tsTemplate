import {Requestor} from 'requestor/requestor';
import {ObjectStore, ObjTable} from './object-store';
import {ObjectFactory, ObjDesc} from './object-factory';
import {DBPromise} from '../common/db-promise';
import {Database} from 'sqlite3';
import {Queue} from '../common/promise';

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
    '  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,',
    '  removed INTEGER,',
    '  idx INTEGER,',
    '  listId INTEGER NOT NULL,',
    '  itemId INTEGER',
    ')'
  ].join('\n');
  return [objTable, objLists];
}

function createTable(desc: ObjDesc) {
  const typeTrans = {
    'string': 'TEXT',
    'number': 'REAL'
  };

  const columns = Object.keys(desc.objects).map(key => {
    const type = desc.objects[key];
    if (['string', 'number'].indexOf(type) != -1) {
      return `   ${key} ${typeTrans[type]}`;
    } else {
      return `   ${key} INTEGER`;
    }
  });

  return [
    `CREATE TABLE IF NOT EXISTS ${desc.classId}(`,
    [`   id INTEGER NOT NULL PRIMARY KEY UNIQUE`].concat(columns).join(',\n'),
    ')'
  ].join('\n');
}

export class SQLObjectStore extends ObjectStore {
  private db: DBPromise;

  private constructor(factory: ObjectFactory, db: DBPromise) {
    super(factory);
    this.db = db;
  }

  static create(factory: ObjectFactory, db: Database): Promise<SQLObjectStore> {
    const tables = createSpecTables();
    factory.getClasses().forEach(name => {
      const desc = factory.get(name);
      tables.push(createTable(desc));
    });
    
    const dbImpl = new DBPromise(db);
    return Queue.all(
      ...tables.map(s => () => {
        console.log(s);
        return dbImpl.execSQL(s);
      }))
      .then(r => new SQLObjectStore(factory, dbImpl))
      .catch(err => console.log(err));
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

  getObjectsFromList(id: string): Promise<Array<string>> {
    return Queue.lastResult(
      () => this.db.getAll(OBJ_LISTS, {cond: {listId: id, removed: "0"}, condOp: 'AND'}),
      (items: Array<{itemId: string}>) => items.map(item => '' + item.itemId)
    );
  }

  createList(): Promise<ObjTable> {
    let objType: ObjTable;
    return this.db.insertAndGet({type: 'object', subtype: 'ListObj'}, OBJ_TABLE);
  }
}
