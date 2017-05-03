import {Database} from 'sqlite3';
import {IThenable} from 'promise';

const Type = {
  id: 'id',
  string: 'string',
  integer: 'int',
  double: 'double',
  array: 'array',
  dateTime: 'datetime',
  object: 'object'
};

const SQLType = {
  [Type.id]: 'INTEGER NOT NULL PRIMARY KEY',  // AUTOINCREMENT UNIQUE
  [Type.string]: 'TEXT',
  [Type.integer]: 'INTEGER',
  [Type.double]: 'REAL',
};

interface DBObjectType {
  extends?: string;
  fields: {[key: string]: string | {type: string, subType: string}}
}
interface DBScheme {
  [name: string]: DBObjectType;
}

const scheme: DBScheme = {
  'Document': {
    fields: {
      name: Type.string,
      createTime: Type.dateTime,
      modifyTime: Type.dateTime,
      version: Type.integer
    }
  },
  'DocPresentation': {
    extends: 'Document',
    fields: {
      sliders: {type: Type.array, subType: 'Slide'}
    }
  },
  'Slide': {
    fields: {
      background: Type.integer,
      width: Type.double,
      height: Type.double,
      name: Type.string,
      objects: {type: Type.array, subType: 'SlideObject'}
    }
  },
  'SlideObject': {
    fields: {
      posX: Type.double,
      posY: Type.double,
      width: Type.double,
      height: Type.double
    }
  }
};

// Document(id, name, docType, ...)
// DocPresentation(id, 

function validateObjectType(scheme: DBScheme, name: string) {
  const obj = scheme[name];
  if (obj.extends && scheme[obj.extends] == null)
    throw `extends type '${obj.extends}' not found in scheme`;
  
  if (!obj.fields || Object.keys(obj.fields).length == 0)
    throw `empty object '${name}' found`;
}

function validate(scheme: DBScheme) {
  Object.keys(scheme).forEach(key => validateObjectType(scheme, key));
}

function createSQL(scheme: DBScheme, name: string) {
  const item = scheme[name];

  let id = 'id INTEGER NOT NULL PRIMARY KEY';
  if (!item.extends)
    id += ' AUTOINCREMENT';
  id += ' UNIQUE';

  const fields = [id].concat(
    Object.keys(item.fields).map(key => {
      const sqlType = SQLType[item.fields[key] as string];
      if (sqlType) {
        return [key, sqlType].join(' ');
      } else {
        return null;
      }
    }).filter(item => item != null)
  ).join(',\n  ');

  return [`CREATE TABLE IF NOT EXISTS ${name} (\n  `].concat(fields).concat(')\n').join('');
}

function creatDatabase(file): IThenable<Database> {
  let db = new Database(file, (err) => err && console.log('error by create', err));
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const objs = Object.keys(scheme);
      objs.forEach((key, idx) => {
        const sql = createSQL(scheme, key);
        console.log(sql);
        db.exec(sql, (err) => {
          err && console.log(err);
          if (idx == objs.length - 1) {
            resolve(db);
            console.log('finished');
          }
        });
      });
    });
  });
}

