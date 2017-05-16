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

  moveObject(objId: number, newParentId: number, key: string): Promise<{id: number}> {
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

function getFields(scheme: ObjScheme, name: string) {
  const objType = scheme[name];
  let objFields = objType.fields;
  
  if (objType.extends)
    objFields = assign({}, scheme[objType.extends].fields, objFields);
  
  return objFields;
}

function createSQL(scheme: ObjScheme, name: string) {
  const item = scheme[name];
  const id = 'id INTEGER NOT NULL PRIMARY KEY UNIQUE';
  const fieldsObj = getFields(scheme, name);
  const fields = [id].concat(
    Object.keys(fieldsObj).map(key => {
      const keyType = fieldsObj[key];
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

// obj -> items -> item


export class StorageScheme {
  private scheme: ObjScheme;
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
    const fields = getFields(this.scheme, type);
    Object.keys(json).forEach(key => {
      const keyType = this.scheme[type].fields[key];
      if (!(key in fields))
        throw `key=${key} is not defined`;

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

        return this.db.moveObject(srcObjId, dstObjId, key);
      }
    ]);
  }

  getObjects(id: Array<number>): Promise<any> {
    return Queue.all([
      () => this.db.getAll(OBJ_TABLE, {cond: {id}}),
      (obj: Array<ObjItem>) => {
        const types: {[type: string]: Array<number>} = {};
        obj.forEach(item => {
          const ids = types[item.type] || (types[item.type] = []);
          ids.push(item.id);
        });

        let resultObjs = Array<ObjItem>();
        return Queue.all(
          Object.keys(types).map(type => {
            return () => this.db.getAll(type, {cond: {id: types[type]}})
            .then(objs => {
              resultObjs = resultObjs.concat(objs);
            });
          }).concat([
            () => {
              return id.map(value => {
                for (let n = 0; n < resultObjs.length; n++)
                  if (resultObjs[n].id == value)
                    return resultObjs[n];
              }) as any;
            }
          ])
        );
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

