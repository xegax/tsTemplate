import {Database} from 'sqlite3';
import {Queue} from './promise';

type Cond = {[key: string]: number | string | Array<string> | Array<number>};
interface GetParams {
  keys?: Array<string>;
  cond?: Cond;
  condOp?: 'OR' | 'AND';
}

function makeWhereCond(cond: Object, op: string) {
  let condKeys = Object.keys(cond);
  if (!condKeys.length)
    return '';

  return condKeys.map(key => {
    const condVal = cond[key];
    if (Array.isArray(condVal)) {
      return '(' + (condVal as Array<string>).map(value => `${key} = "${value}"`).join(' OR ') + ')';
    } else {
      return `${key} = "${condVal}"`;
    }
  }).join(` ${op} `);
}

export class DBPromise {
  private db: Database;
  private queue = new Queue();

  constructor(db: Database) {
    this.db = db;
  }

  static openOrCreate(file: string): Promise<DBPromise> {
    return new Promise<DBPromise>((resolve, reject) => {
      let db = new Database(file, err => {
        err && reject(err);
        !err && resolve(new DBPromise(db));
      });
    });
  }

  execSQL(sql: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, err => {
        err && reject(err);
        !err && resolve(null);
      });
    });
  }

  getSQL<T>(sql: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.db.get(sql, (err, row) => {
        err && reject(err);
        !err && resolve(row);
      });
    });
  }

  getSQLAll<T>(sql: string): Promise<Array<T>> {
    return new Promise<Array<T>>((resolve, reject) => {
      this.db.all(sql, (err, rows: Array<T>) => {
        err && reject(err);
        !err && resolve(rows);
      });
    });
  }

  getAll<T>(table: string, params?: GetParams): Promise<any> {
    let where = '';
    let keys = '*';
    if (params && params.keys)
      keys = params.keys.join(', ');

    if (params && params.cond) {
      const cond = makeWhereCond(params.cond, params.condOp || 'OR');
      if (cond.length)
        where += 'WHERE ' + cond;
    }
    const sql = `SELECT ${keys} FROM ${table} ${where}`;
    return this.getSQLAll(sql);
  }

  get<T>(table: string, params?: GetParams): Promise<T> {
    return this.getAll(table, params).then(rows => rows && rows[0] || null);
  }

  update(values: Object, table: string, cond: Cond, wrapValue?): Promise<any> {
    wrapValue = wrapValue || ((val) => `"${val}"`);
    return new Promise((resolve, reject) => {
      const keysAndTerms = Object.keys(values).filter(key => key != null).map(k => `${k}=${wrapValue(values[k])}`).join(', ');
      let where = makeWhereCond(cond, 'AND');

      if (where.length)
        where = 'WHERE ' + where;

      const sql = `UPDATE ${table} SET ${keysAndTerms} ${where}`;
      console.log(sql);
      this.db.exec(sql, err => {
        err && reject(err);
        !err && resolve(null);
      });
    });
  }

  updateAll(values: Array<Object>, table: string, cond: Cond): Promise<any> {
    return Queue.all(
      ...values.map((value, i) => () => {
        const c = {...cond, idx: i};
        return this.update(value, table, c);
      })
    );
  }

  insert(values: Object, table: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(values).filter(key => key != null);
      const sql = `INSERT INTO ${table}(${keys}) VALUES(${keys.map(k => '"' + values[k] + '"').join(', ')})`;
      this.db.exec(sql, err => {
        err && reject(err);
        !err && resolve(null);
      });
    });
  }

  insertAll(values: Array<Object>, table: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(values[0]).filter(key => key != null);
      const valuesArr = values.map(vals => '(' + keys.map(k => `"${vals[k]}"`).join(', ') + ')').join(', ');
      const sql = `INSERT INTO ${table}(${keys}) VALUES ${valuesArr}`;
      this.db.exec(sql, err => {
        err && reject(err);
        !err && resolve(null);
      });
    });
  }

  insertAndGet(values: Object, table: string): Promise<any> {
    return Queue.lastResult(
      () => this.insert(values, table),
      () => this.getSQL(`SELECT * FROM ${table} WHERE _rowid_ = last_insert_rowid()`)
    );
  }

  addToQueue(taskMaker: (data) => any) {
    this.queue.pushAndSkipError(taskMaker);
  }

  getSizeOfQueue() {
    return this.queue.getSize();
  }

  close() {
    this.db.close();
  }
}