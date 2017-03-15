import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../table/filter-condition';
import {IThenable} from 'promise';
import {createConnection} from 'mysql';
import {SortColumn, SortDir} from '../common/table';

let conn = createConnection({host: 'localhost', port: 3306, user: 'root', database: 'booksdb'});
conn.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log('connected');
  }
});

let idCounter = 0;
function getNewId() {
  idCounter++;
  return 'tmp' + idCounter;
}

interface TableParams {
  filter?: FilterCondition;
  sorting?: Array<SortColumn>;
  type?: 'distinct';
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
  let where = '';
  let order = '';
      
  if (params.filter)
    where = 'where ' + getSqlCondition(params.filter);

  if (params.sorting)
    order = 'order by ' + params.sorting.map(k => k.column + ' ' + SortDir[k.dir]).join(', ');
  
  return `select * from ${table} ${where} ${order}`;
}

export class Table {
  private table: string;
  private parent: Table;
  private rows: number;
  private columns: Array<Array<string>>;

  constructor(table: string) {
    this.table = table;
  }

  getName() {
    return this.table;
  }

  setParams(params: TableParams): IThenable<number> {
    if (this.parent == null)
      return new Promise((resolve, reject) => {
        reject('setParams can be called only for child tables');
      });
    
    return new Promise((resolve, reject) => {
      conn.query(`drop table if exists ${this.table}`, (err, rows) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          conn.query(`create temporary table ${this.table} as ` + getSQL(this.parent.table, params), (err) => {
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
      const sql = `create temporary table ${newTable} as ` + getSQL(this.table, params);
      console.log(sql);

      conn.query(sql, (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          let table = new Table(newTable);
          table.parent = this;
          table.updateInfo().then(num => {
            resolve(table);
          });
        }
      });
    });
  }

  getData(start?: number, count?: number, columnsArr?: Array<string>): IThenable<Array<Row>> {
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

      let select = `select ${columns} from ${this.table} ${limit} ${offset}`;

      console.log(select);
      conn.query(select, (err, rows) => {
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
    return new Promise((resolve, reject) => {
      conn.query(`select count(*) as count from ${this.table}`, (err, rows) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          this.rows = +rows[0]['count'];
          resolve(this.rows);
        }
      });
    });
  }

  private updateColumns(): IThenable<any> {
    return new Promise((resolve, reject) => {
      conn.query(`show columns from ${this.table}`, (err, rows: Array<Object>) => {
        if (!err) {
          this.columns = rows.map(row => [row['Field'], row['Type']]);
          resolve(this.columns);
        } else {
          console.log(err);
          reject(err);
        }
      });
    });
  }

  updateInfo(): IThenable<any> {
    return Promise.all([this.updateRows(), this.updateColumns()]);
  }

  getRows() {
    return this.rows;
  }

  getColumns() {
    return this.columns;
  }
}
