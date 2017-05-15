import {Database} from 'sqlite3';
import {Queue} from './promise';

interface GetParams {
  keys?: Array<string>;
  cond?: {[key: string]: number | string | Array<string> | Array<number>};
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
      let condKeys = Object.keys(params.cond);
      if (condKeys.length) {
        where = 'WHERE ' + condKeys.map(key => {
          let cond = params.cond[key];
          if (Array.isArray(cond)) {
            return '(' + (cond as Array<string>).map(value => `${key} = "${value}"`).join(' OR ') + ')';
          } else {
            return `${key} = "${cond}"`;
          }
        }).join(' OR ');
      }
    }
    const sql = `SELECT ${keys} FROM ${table} ${where}`;
    return this.getSQLAll(sql);
  }

  get<T>(table: string, params?: GetParams): Promise<any> {
    return this.getAll(table, params).then(rows => rows && rows[0] || null);
  }

  insert(values: Object, table: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const keys = Object.keys(values);
      const sql = `INSERT INTO ${table}(${keys}) VALUES(${keys.map(k => '"' + values[k] + '"').join(', ')})`;
      this.db.exec(sql, err => {
        err && reject(err);
        !err && resolve(null);
      })
    });
  }

  insertAndGet(values: Object, table: string): Promise<any> {
    return Queue.all([
      () => this.insert(values, table),
      () => this.getSQL(`SELECT * FROM ${table} WHERE _rowid_ = last_insert_rowid()`)
    ]);
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