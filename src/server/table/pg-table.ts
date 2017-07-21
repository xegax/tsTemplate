import {Pool, Client} from 'pg';
import {SortColumn, SortDir} from '../../common/table';
import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../../table/filter-condition';
import {Table} from './table';

let pool: Pool;
let conn: Client;
let done = (err: Error) => {};

function connect() {
  let config = {
    user: 'root', //env var: PGUSER 
    database: 'postgres', //env var: PGDATABASE 
    password: 'z3cq15as', //env var: PGPASSWORD 
    host: 'localhost', // Server hosting the postgres database 
    port: 5432, //env var: PGPORT 
    max: 10, // max number of clients in the pool 
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed 
  };
  pool = new Pool(config);

  pool.connect((err, client, doneImpl) => {
    if (err) {
      console.log(err);
    }
    conn = client;
    done = doneImpl;
  });

  pool.on('error', (err, client) => {
    console.log(err);
    done = () => {};
    conn = null;
  });
}

connect();

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
    return `select ${column}, count(${column}) as count from booksdb.${table} group by ${column} order by ${order} ${dir}`;
  }

  let where = '';
  let order = '';
      
  if (params.filter)
    where = 'where ' + getSqlCondition(params.filter);

  if (params.sorting && params.sorting.length)
    order = 'order by ' + params.sorting.map(k => k.column + ' ' + SortDir[k.dir]).join(', ');
  
  return `select * from booksdb.${table} ${where} ${order}`;
}

export class PGTableImpl implements Table {
  private table: string;
  private parent:PGTableImpl;
  private rows: number;
  private columns: Array<Array<string>>;

  constructor(table: string) {
    this.table = table;
  }

  getName() {
    return this.table;
  }

  getParent() {
    return this.parent;
  }

  setParams(params: TableParams): Promise<number> {
    if (this.parent == null)
      return new Promise((resolve, reject) => {
        reject('setParams can be called only for child tables');
      });
    
    return new Promise((resolve, reject) => {
      const sql = getSQL(this.parent.table, params);
      console.log(`drop ${this.table}`);
      console.log(sql);
      conn.query(`drop table if exists booksdb.${this.table}`, (err, rows) => {
        done(err);
        if (err) {
          console.log(err);
          reject(err);
        } else {
          conn.query(`create temporary table booksdb.${this.table} as ${sql}`, (err) => {
            done(err);
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

  getSubtable(params: TableParams): Promise<Table> {
    return new Promise((resolve, reject) => {
      const newTable = getNewId();
      const sql = `create temporary table booksdb.${newTable} as ` + getSQL(this.table, params);
      console.log(sql);

      conn.query(sql, (err) => {
        done(err);
        if (err) {
          console.log(err);
          reject(err);
        } else {
          let table = new PGTableImpl(newTable);
          if (!params.distinct)
            table.parent = this;
          table.updateInfo().then(num => {
            resolve(table);
          });
        }
      });
    });
  }

  getData(start?: number, count?: number, columnsArr?: Array<string>): Promise<Array<Row>> {
    return new Promise((resolve, reject) => {
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

      let select = `select ${columns} from booksdb.${this.table} ${limit} ${offset}`;

      console.log(select);
      conn.query(select, (err, rows) => {
        done(err);
        if (!err) {
          resolve(rows.rows.map(row => Object.keys(row).map(key => row[key])));
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  private updateRows(): Promise<number> {
    return new Promise((resolve, reject) => {
      conn.query(`select count(*) as count from booksdb.${this.table}`, (err, rows) => {
        done(err);
        if (err) {
          console.log(err);
          reject(err);
        } else {
          this.rows = +rows.rows[0]['count'];
          resolve(this.rows);
        }
      });
    });
  }

  private updateColumns(): Promise<any> {
    return new Promise((resolve, reject) => {
      conn.query(`select * from information_schema.columns where table_schema = booksdb and table_name='${this.table}'`, (err, rows) => {
        done(err);
        if (!err) {
          this.columns = rows.rows.map(row => [row['Field'], row['Type']]);
          resolve(this.columns);
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  private updateInfo(): Promise<any> {
    console.log('updateInfo');
    return Promise.all([this.updateRows(), this.updateColumns()]);
  }

  getRows() {
    return this.rows;
  }

  getColumns() {
    return this.columns;
  }
}
