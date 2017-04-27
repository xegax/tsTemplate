import {IThenable} from 'promise';
import {createConnection} from 'mysql';
import {SortColumn, SortDir} from '../../common/table';
import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../../table/filter-condition';
import {Table} from './table';
import {Database} from 'sqlite3';

let db: Database;
function connect() {
  db = new Database('data/books.db', (err) => {
    if (err)
      console.log(err);
  });
}

let idCounter = 0;
function getNewId() {
  idCounter++;
  return 'tmp' + idCounter;
}

interface TableParams {
  filter?: FilterCondition;
  sorting?: Array<SortColumn>;
  distinct?: string;
}

function getSqlCondition(condition: FilterCondition): string {
  if (condition == null)
    return '';

  let comp = condition as CompoundCondition;
  
  return comp.condition.map((cond: ConditionCat | ConditionText | CompoundCondition) => {
    let compCond = cond as CompoundCondition;
    if (compCond.op != null)
      return getSqlCondition(compCond);
    let catCond = cond as ConditionCat;
    let textCond = cond as ConditionText;
    if (textCond.textValue != null)
      return `(${textCond.column} like "${textCond.textValue}")`;
    return '(' + catCond.catValues.map(value => (catCond.inverse ? 'not ': '') + `${catCond.column}="${value}"`).join(catCond.inverse ? ' and ' : ' or ') + ')';
  }).join(` ${comp.op} `);
}

type Row = Array<number | string>;

function getSQL(table: string, params: TableParams) {
  if (params.distinct) {
    const column = params.distinct;
    let order = 'count';
    let dir = 'desc';
    if (params.sorting && params.sorting.length) {
      order = params.sorting[0].column;
      dir = SortDir[params.sorting[0].dir];
    }
    return `select ${column}, count(${column}) as count from ${table} group by ${column} order by ${order} ${dir}`;
  }

  let where = '';
  let order = '';
      
  if (params.filter)
    where = 'where ' + getSqlCondition(params.filter);

  if (params.sorting && params.sorting.length)
    order = 'order by ' + params.sorting.map(k => k.column + ' ' + SortDir[k.dir]).join(', ');
  
  return `select * from ${table} ${where} ${order}`;
}

function serializePromise(callback: (resolve, reject) => void): IThenable<any> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      callback(resolve, reject);
    });
  });
}

function wrapPromise(callback: (resolve, reject) => void): IThenable<any> {
  return new Promise((resolve, reject) => {
    callback(resolve, reject);
  });
}

export class SQLiteTableImpl implements Table {
  private table: string;
  private parent: SQLiteTableImpl;
  private rows: number;
  private columns: Array<Array<string>>;

  constructor(table: string) {
    this.table = table;
    if (!db)
      connect();
  }

  getName() {
    return this.table;
  }

  getParent() {
    return this.parent;
  }

  setParams(params: TableParams): IThenable<number> {
    if (this.parent == null)
      return new Promise((resolve, reject) => {
        reject('setParams can be called only for child tables');
      });
    
    return serializePromise((resolve, reject) => {
      const sql = getSQL(this.parent.table, params);
      console.log(`drop ${this.table}`);
      console.log(sql);
      db.exec(`drop table if exists ${this.table}`, (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          db.exec(`create temp table ${this.table} as ${sql}`, (err) => {
            if (err) {
              console.log(err);
            } else {
              this.updateInfo().then(resolve);
            }
          });
        }
      });
    });
  }

  getSubtable(params: TableParams): IThenable<Table> {
    return new Promise((resolve, reject) => {
      const newTable = getNewId();
      const sql = `create temp table ${newTable} as ` + getSQL(this.table, params);
      console.log(sql);

      db.exec(sql, (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          let table = new SQLiteTableImpl(newTable);
          if (!params.distinct)
            table.parent = this;
          table.updateInfo().then(num => {
            resolve(table);
          });
        }
      });
    });
  }

  getData(start?: number, count?: number, columnsArr?: Array<string>): IThenable<Array<Row>> {
    return serializePromise((resolve, reject) => {
      let offset = '';
      let limit = 'limit 10';
      if (start != null) {
        offset = 'offset ' + start;
      }

      if (count != null) {
        limit = 'limit ' + count;
      }

      let columns = '*';
      if (columnsArr && columnsArr.length) {
        columns = columnsArr.join(', ');
      }

      let select = `select ${columns} from ${this.table} ${limit} ${offset}`;

      console.log(select);
      db.all(select, (err, rows) => {
        if (!err) {
          resolve(rows.map(row => Object.keys(row).map(key => row[key])));
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  private updateRows(): IThenable<number> {
    return serializePromise((resolve, reject) => {
      db.get(`select count(*) as count from ${this.table}`, (err, row) => {
        if (!err) {
          let rows = row['count'];
          if (rows != null)
            this.rows = +rows;
          resolve(this.rows);
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  private updateColumns(): IThenable<any> {
    return serializePromise((resolve, reject) => {
      db.all(`pragma table_info(${this.table})`, (err, rows: Array<Object>) => {
        if (!err) {
          this.columns = rows.map(row => [row['name'], row['type']]);
          resolve(this.columns);
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  private updateInfo(): IThenable<any> {
    return Promise.all([this.updateRows(), this.updateColumns()]);
  }

  getRows() {
    return this.rows;
  }

  getColumns() {
    return this.columns;
  }
}
