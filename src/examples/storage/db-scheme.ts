import {Database} from 'sqlite3';
import {IThenable} from 'promise';
import {assign} from 'lodash'
import {DBPromise} from '../../common/db-promise';
import {
  Type,
  ObjScheme
} from './obj-scheme';
import {Queue} from '../../common/promise';

const SQLType = {
  [Type.string]: 'TEXT',
  [Type.integer]: 'INTEGER',
  [Type.double]: 'REAL',
};

class DB {
  private db: Database;
  constructor(db: Database) {
    this.db = db;
  }

  close() {
    this.db.close();
  }

  insertAndGet(table: string, data: Object): Promise<Object> {
    const keys = Object.keys(data);
    const values = keys.map(key => '"' + data[key] + '"').join(', ');
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.exec(log(`INSERT INTO ${table}(${keys.join(', ')}) VALUES(${values})`), err => err && reject(errLog(err)));
        this.db.get(log(`SELECT * FROM ${table} WHERE _rowid_ == last_insert_rowid()`), (err, row) => {
          err && reject(errLog(err));
          row && resolve(row);
        });
      });
    });
  }

  moveObj(objId: number, newParentId: number, key: string): Promise<{id: number}> {
    if (objId == newParentId)
      throw 'Object can not be moved into self';
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        console.log('tryng to check obj and parentId');
        this.db.get(log(`SELECT id as count FROM ${OBJ_TABLE} WHERE id=${objId} OR id=${newParentId} OFFSET 0 LIMIT 2`), (err, row) => {
          if (row.count != 2)
            throw `objId=${objId} or parentId=${newParentId} not found`;
        });
        this.db.get(log(`SELECT id FROM ${OBJ_RELATIONS} WHERE childId=${objId}`), (err, row) => {
          if (err)
            return reject(err);
          if (!row)
            return this.insertAndGet(OBJ_RELATIONS, {childId: objId, ownerId: newParentId, field: key}).then(resolve);
          this.db.exec(log(`UPDATE ${OBJ_RELATIONS} SET ownerId=${newParentId}, field="${key}" WHERE id=${row.id}`), (err) => {
            if (err)
              return reject(err);
            resolve(row);
          });
        });
      });
    });
  }

  insert(table: string, data: Object): Promise<Object> {
    const keys = Object.keys(data);
    const values = keys.map(key => '"' + data[key] + '"').join(', ');
    return new Promise((resolve, reject) => {
      this.db.exec(log(`INSERT INTO ${table}(${keys.join(', ')}) VALUES(${values})`), (err) => {
        if (!err)
          resolve(null);
        else
          reject(errLog(err));
      });
    });
  }

  createObject(objType: string, data: Object, owner?: Owner): IThenable<Object> {
    // тут нужна проверка на 
    return new Promise((resolve, reject) => {
      // добавляем объект в общую базу
      this.insertAndGet(OBJ_TABLE, {type: objType}).then(row => {
        const id = row['id'];
        data = assign({id}, data);
        const keys = Object.keys(data);
        const values = keys.map(key => '"' + data[key] + '"').join(', ');
        // добавляем объект в базу соответствующего типа
        this.insertAndGet(objType, data).then((row) => {
          // создаём связь на owner (объект добавляем в овнер)
          if (owner) {
            this.insertAndGet(OBJ_RELATIONS, {ownerId: owner.id, childId: id, field: owner.field}).then(() => {
              resolve(row);
            }).catch(err => reject(errLog(err)));
          } else {
            resolve(row);
          }
        }).catch(err => reject(errLog(err)));
      }).catch(err => reject(errLog(err)));
    });
  }

  getLastInsertObject(table: string): IThenable<Object> {
    return new Promise((resolve, reject) => {
      this.db.get(log(`SELECT * FROM ${table} WHERE _rowid_ == last_insert_rowid()`), (err, row) => {
        if (!err) {
          resolve(row);
        } else {
          reject(err);
        }
      });
    });
  }

  getCountByOwner(owner: Owner): IThenable<number> {
    return new Promise((resolve, reject) => {
      this.db.get(log(`SELECT count(*) as count FROM ${OBJ_RELATIONS} WHERE ownerId=${owner.id} AND field="${owner.field}"`), (err, row) => {
        if (!err) {
          resolve(row['count']);
        } else {
          reject(errLog(err));
        }
      });
    });
  }

  getCount(): IThenable<number> {
    return new Promise((resolve, reject) => {
      this.db.get(log(`SELECT count(id) as count, id FROM ${OBJ_TABLE} WHERE NOT id IN (SELECT childId FROM ${OBJ_RELATIONS})`), (err, row) => {
        if (!err) {
          resolve(row['count']);
        } else {
          reject(errLog(err));
        }
      });
    });
  }

  getObjects(params: ObjectListParams): IThenable<Array<Object>> {
    return new Promise((resolve, reject) => {
      const limit = params.count != null ? 'LIMIT ' + params.count : '';
      const offs = params.from != null ? 'OFFSET ' + params.from : '';
      let where = '';
      if (params.owner) {
        where = `WHERE id IN (SELECT childId FROM ${OBJ_RELATIONS} WHERE ownerId=${params.owner.id} AND field="${params.owner.field}")`;
      } else {
        where = `WHERE NOT id IN (SELECT childId FROM ${OBJ_RELATIONS})`;
      }
      const objTable = params.base || OBJ_TABLE;
      this.db.all(log(`SELECT * FROM ${objTable} ${where} ${limit} ${offs}`), (err, rows) => {
        if (!err) {
          resolve(rows);
        } else {
          reject(errLog(err));
        }
      });
    });
  }

  getObjectsByType(objType: string, start?: number, count?: number, owner?: Owner): IThenable<Array<Object>> {
    return new Promise((resolve, reject) => {
      let limit = count != null ? 'LIMIT ' + count : '';
      let offs = start != null ? 'OFFSET ' + start : '';
      if (!owner) {
        this.db.all(log(`SELECT * FROM ${objType} WHERE id IN (SELECT id FROM ${OBJ_TABLE} WHERE type="${objType}") ${limit} ${offs}`), (err, rows) => {
          if (!err) {
            resolve(rows);
          } else {
            reject(errLog(err));
          }
        });
      } else {
        this.db.all(log(`SELECT * FROM ${objType} WHERE id IN (SELECT childId FROM ${OBJ_RELATIONS} WHERE ownerId="${owner.id} AND field="${owner.field}") ${limit} ${offs}`), (err, rows) => {
          if (!err) {
            resolve(rows);
          } else {
            reject(errLog(err));
          }
        });
      }
    });
  }

  getObjectById(id: number, owner?: Owner): IThenable<Object> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        let obj = null;
        this.db.get(log(`SELECT type FROM ${OBJ_TABLE} WHERE id=${id} LIMIT 1`), (err, obj) => {
          if (err)
            return reject(errLog(err));

          this.db.get(log(`SELECT * FROM ${obj.type} WHERE id=${id} LIMIT 1`), (err, child) => {
            err && reject(errLog(err));
            child && resolve(assign(obj, child));
          });
        });
      });
    });
  }

  removeById(objType: string, id: number): IThenable<boolean> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.exec(log(`DELETE FROM ${objType} WHERE id=${id}`), err => err && reject(errLog(err)));
        this.db.exec(log(`DELETE FROM ${OBJ_TABLE} WHERE id=${id}`), err => err && reject(errLog(err)));
        this.db.all(log(`SELECT id FROM ${objType} WHERE id=${id} UNION ALL SELECT id FROM ${OBJ_TABLE} WHERE id=${id} LIMIT 2`), (err, rows) => {
          if (!rows || rows.length == 0)
            resolve(true);
          else
            reject(`Object id=${id} can not be delete`);
        });
      });
    });
  }
}

class DBHelper extends DBPromise {
  static openOrCreate(file: string): Promise<DBHelper> {
    return new Promise<DBHelper>((resolve, reject) => {
      let db = new Database(file, err => {
        err && reject(err);
        !err && resolve(new DBHelper(db));
      });
    });
  }

  getObjectsCount(owner?: Owner): Promise<number> {
    let sql = '';
    if (owner) {
      sql = `SELECT count(*) as count FROM ${OBJ_RELATIONS} WHERE ownerId=${owner.id} AND field="${owner.field}"`;
    } else {
      sql = `SELECT count(id) as count, id FROM ${OBJ_TABLE} WHERE NOT id IN (SELECT childId FROM ${OBJ_RELATIONS})`;
    }
    return this.getSQL<{count: number}>(sql).then(row => row.count);
  }

  moveObj(objId: number, newParentId: number, key: string): Promise<{id: number}> {
    const getChildRel = `SELECT id FROM ${OBJ_RELATIONS} WHERE childId=${objId}`;
    return Queue.all([
      () => this.getSQL<{id: number}>(getChildRel),
      (row) => {
        if (!row)
          return this.insertAndGet({childId: objId, ownerId: newParentId, field: key}, OBJ_RELATIONS);
        return this.execSQL(`UPDATE ${OBJ_RELATIONS} SET ownerId=${newParentId}, field="${key}" WHERE id=${row.id}`).then(() => row);
      }
    ]);
  }
}
// Document(id, name, docType, ...)
// DocPresentation(id, 

function validateObjectType(scheme: ObjScheme, name: string) {
  const obj = scheme[name];
  if (obj.extends && scheme[obj.extends] == null)
    throw `extends type '${obj.extends}' not found in scheme`;

  if (!obj.fields || Object.keys(obj.fields).length == 0)
    throw `empty object '${name}' found`;
}

function validate(scheme: ObjScheme) {
  Object.keys(scheme).forEach(key => validateObjectType(scheme, key));
}

const OBJ_TABLE = 'ObjTable';
const OBJ_RELATIONS = 'ObjRelations';
function createSpecTables() {
  const objTable = [
    `CREATE TABLE IF NOT EXISTS ${OBJ_TABLE}(`,
    '  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,',
    '  type TEXT,',
    '  createTime TIMEDATE DEFAULT CURRENT_TIMESTAMP',
    ')'
  ].join('\n');

  const objRel = [
    `CREATE TABLE IF NOT EXISTS ${OBJ_RELATIONS}(`,
    '  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,',
    '  ownerId INTEGER NOT NULL,',
    '  childId INTEGER NOT NULL,',
    '  field TEXT',
    ')'
  ].join('\n');
  return [objTable, objRel];
}

export interface ObjId {
  id: number;
}

export interface ObjItem extends ObjId {
  type: string;
  createTime: number;
}

export interface ObjRelItem extends ObjId {
  ownerId: number;
  childId: number;
  field: string;
}

function createSQL(scheme: ObjScheme, name: string) {
  const item = scheme[name];
  const id = 'id INTEGER NOT NULL PRIMARY KEY UNIQUE';
  const fields = [id].concat(
    Object.keys(item.fields).map(key => {
      const keyType = item.fields[key];
      if (typeof keyType != 'string')
        return null;

      let sqlType = SQLType[keyType];
      
      // reference to other object
      if (!sqlType && scheme[keyType])
        sqlType = SQLType[Type.integer];

      if (sqlType) {
        return [key, sqlType].join(' ');
      } else {
        throw `error in type ${name}`;
      }
    }).filter(item => item != null)
  ).join(',\n  ');

  return [`CREATE TABLE IF NOT EXISTS ${name} (\n  `].concat(fields).concat(')\n').join('');
}

function sqlColumns(obj: Object): string {
  return Object.keys(obj).join(', ');
}

function sqlValues(obj: Object): string {
  return Object.keys(obj).map(k => `"${obj[k]}"`).join(', ');
}

export interface ServerObj {
  getType(): string;
  getId(): number;
  setValue(name: string, value: string);
  getValue(name: string): string;
  getList(name: string): IThenable<ServerList>;
  getObject(): IThenable<Object>;
}

export interface ServerList {
  getCount(): number;
  addObject(type: string, params: any): IThenable<ServerObj>;
  getObject(id: number): IThenable<ServerObj>;
  getObjectList(from?: number, count?: number): IThenable<Array<ServerObj>>;
  removeObject(id: number);
}

function log(s) {
  console.log(s);
  return s;
}

interface Owner {
  id: number;
  field: string;
}

function errLog(err) {
  return err;
}

interface ObjectListParams {
  from?: number;
  count?: number;
  base?: string;
  owner?: Owner;
}

// ObjTable
// id, t1
// id, t2
// id, t1
// id, t3
// id, t1

// Obj2D
// id, type, x, y
// id, type, x, y

interface Parent {
  type: string;
  id: number;
  key: string;  // ParentType[key]
}

export class ListImpl implements ServerList {
  private parent: Parent;
  private ctx: StorageScheme;

  private itemType: string;  
  private count: number;

  private constructor(ctx: StorageScheme, parent?: Parent) {
    this.ctx = ctx;
    this.parent = parent;
    if (parent)
      this.itemType = ctx.getTypeOfKey(parent.type, parent.key);
  }

  static create(ctx: StorageScheme, parent?: Parent): Promise<ServerList> {
    /*return new Promise((resolve, reject) => {
      let list = new ListImpl(ctx, parent);

      const updateCount = count => {
        list.count = count;
        resolve(list);
      };
      if (parent) {
        ctx.getDB().getCountByOwner({id: parent.id, field: parent.key}).then(updateCount).catch(reject);
      } else {
        ctx.getDB().getCount().then(updateCount).catch(reject);
      }
    });*/
    return null;
  }

  private getOwner() {
    if (!this.parent)
      return null;
    return {id: this.parent.id, field: this.parent.key};
  }

  private getDB() {
    return this.ctx.getDB();
  }

  private updateCount(): IThenable<number> {
    /*const update = count => this.count = count;
    if (this.parent) {
      return this.ctx.getDB().getCountByOwner(this.getOwner()).then(update);
    } else {
      return this.ctx.getDB().getCount().then(update);
    }*/
    return null;
  }

  addObject(type: string, data: any): IThenable<ServerObj> {
    return null;
    /*this.ctx.validateType(type);

    return new Promise((resolve, reject) => {
      this.ctx.getDB().createObject(type, data, null).then(obj => {
        obj = assign({type}, obj);
        this.updateCount().then(() => resolve(new ObjImpl(this.ctx, obj))).catch(err => console.log(errLog(err)));
      }).catch(err => console.log(errLog(err)));
    });*/
  }

  getObjectList(from?: number, count?: number): IThenable<Array<ServerObj>> {
    /*if (from != null && !count) {
      count = this.count - Math.min(from, this.count - 1);
    }

    if (from != null && count == 0) {
      return new Promise((resolve, reject) => resolve([]));
    }

    if (this.parent) {
      return this.getDB().getObjects({from, count, base: this.itemType, owner: this.getOwner()});
    } else {
      return this.getDB().getObjects({from, count});
    }*/
    return null;
  }

  getObject(id: number) {
    /*return this.getDB().getObjectById(id).then(obj => {
      return new ObjImpl(this.ctx, obj);
    });*/
    return null;
  }

  removeObject(id: number) {
  }

  getCount(): number {
    return this.count;
  }
}

export class ObjImpl implements ServerObj {
  private ctx: StorageScheme;
  private data: any;

  constructor(ctx: StorageScheme, data: any) {
    this.ctx = ctx;
    this.data = data;
  }

  private getDB() {
    return this.ctx.getDB();
  }

  getType() {
    return this.data.type;
  }

  getId() {
    return this.data.id;
  }

  setValue(name: string, value: string) {
    if (name in this.data)
      this.data[name] = value;
  }

  getValue(name: string): string {
    return this.data[name];
  }

  getList(name: string): IThenable<ServerList> {
    return null;
    //return ListImpl.create(this.ctx, null);
  }

  getObject(): IThenable<Object> {
    return null;
    //return this.getDB().getObjectById(this.getId());
  }
}

// obj -> items -> item


export class StorageScheme {
  private scheme: ObjScheme;
  private list: ListImpl;
  private db: DBHelper;

  constructor(db: DBHelper, scheme: ObjScheme) {
    this.scheme = scheme;
    this.db = db;

    validate(scheme);
  }

  createObject(type: string, json: Object): Promise<Object> {
    if (!this.scheme[type])
      throw `object type=${type} is not defined`;
    
    const checkIds = [];
    const idToKey = [];
    Object.keys(json).forEach(key => {
      const keyType = this.scheme[type].fields[key];
      if (typeof keyType != 'string')
        return;

      // referenece to other object
      if (this.scheme[keyType]) {
        if (typeof json[key] != 'number')
          throw `reference to object ${key}=${json[key]} must be number id`;
        
        // only unique ids
        if (checkIds.indexOf(json[key]) == -1) {
          checkIds.push(json[key]);
          idToKey[json[key]] = key;
        }
      }
    });

    const checkTasks: Array<(data?: any) => any> = checkIds.length ? [
      () => this.db.getAll(OBJ_TABLE, {cond: {id: checkIds}}).then((arr: Array<ObjItem>) => {
        if (arr.length == checkIds.length) {
          arr.forEach(obj => {
            const baseType = this.scheme[type].fields[idToKey[obj.id]];
            if (baseType == obj.type || baseType == this.scheme[obj.type].extends)
              return;
            throw `key=${idToKey[obj.id]} has no valid type, it must be extended from ${baseType}`;
          });
          return arr;
        }
        const arrIds = arr.map(obj => obj.id);
        const notFoundIds = checkIds.filter(id => arrIds.indexOf(id) == -1);
        throw `objects are not found: ${notFoundIds.join(', ')}`;
      })
    ] : [];
    return Queue.all(checkTasks.concat([
      () => this.db.insertAndGet({type}, OBJ_TABLE),
      (obj: ObjId) => this.db.insertAndGet(assign({id: obj.id}, json), type)
    ]));
  }

  moveObject(srcObjId: number, dstObjId: number, key: string): Promise<ObjId> {
    if (srcObjId == dstObjId)
      throw 'object can not be move into self';

    return Queue.all([
      () => this.db.getAll(OBJ_TABLE, {cond: {id: [srcObjId, dstObjId]}}),
      (arr: Array<ObjItem>) => {
        if (arr.length > 2)
          throw 'database may be corrupted!';
        if (arr.length == 0)
          throw `srcObj=${srcObjId} and dstObj=${dstObjId} not found`;
        if (arr.length == 1 && arr[0].id == srcObjId)
          throw `dstObj=${dstObjId} not found`;
        if (arr.length == 1 && arr[0].id == dstObjId)
          throw `srcObj=${srcObjId} not found`;
        const dst = arr.filter(item => item.id == dstObjId);
        if (!this.isTypeHasKey(dst[0].type, key))
          throw `Object with type=${dst[0].type} has no key=${key}`;

        return this.db.moveObj(srcObjId, dstObjId, key);
      }
    ]);
  }

  getObject(srcObjId: number): Promise<any> {
    return Queue.all([
      () => this.db.get(OBJ_TABLE, {cond: {id: srcObjId}}),
      (obj: ObjItem) => {
        return this.db.get(obj.type, {cond: {id: srcObjId}});
      }
    ]);
  }

  isTypeHasKey(type: string, key: string): boolean {
    if (this.scheme[type] == null)
      throw `type=${type} not defined`;
    return key in this.scheme[type].fields;
  }

  isTypeExists(type: string): boolean {
    return type in this.scheme;
  }

  getTypeOfKey(objType: string, key: string): string {
    const entry = this.scheme[objType];
    if (!entry)
      throw `unknown type='${objType}'`;
    const type = entry.fields[key];
    return typeof type == 'string' ? type : type.subType;
  }

  getDB() {
    return this.db;
  }
}

export function createScheme(db: string, scheme: ObjScheme): Promise<StorageScheme> {
  const objs = Object.keys(scheme);
  const tables = createSpecTables().concat(objs.map((key, idx) => {
    return createSQL(scheme, key);
  }));

  return Queue.all([
    () => DBHelper.openOrCreate(db),
    (db: DBHelper) => {
      return Promise.all(tables.map(sql => db.execSQL(sql))).then(() => db);
    },
    (db: DBHelper) => new StorageScheme(db, scheme)
  ]);
}

