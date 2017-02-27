import * as http from 'http';
import {createServer} from './server';
import {createConnection} from 'mysql';
import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../model/filter-condition';
import {SortColumn, SortDir} from '../model/table-source-model';

var srv = createServer(8088);

interface Params {
  table: string;
  columns: Array<string>;
  sorting: Array<SortColumn>;
  filter: FilterCondition;
}

let conn = createConnection({host: 'localhost', port: 3306, user: 'root', database: 'booksdb'});
conn.connect((err) => {
  if (err) {
    console.log(err);
  }
});

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

srv.addJsonHandler<{id: string}, Params>('/handler/columns', (params, resolve) => {
  conn.query(`show columns from ${params.get.id}`, (err, rows: Array<Object>) => {
    if (!err) {
      resolve(rows.map(row => [row['Field'], row['Type']]));
    } else {
      console.log(err);
      resolve(err);
    }
  });
});

srv.addJsonHandler<{name: string}, Params>('/handler/table-info', (params, resolve) => {
  let tableId = 'tmpT1';
  const info = {
    rows: 0,
    columns: [],
    id: tableId
  };
  conn.query(`select * from ${params.get.name} limit 1`, (err, rows) => {
    if (!err) {
      info.columns = Object.keys(rows[0]);
    } else {
      console.log(err);
      resolve(err);
    }
  });

  let where = getSqlCondition(params.post.filter);
  if (where != '')
    where = 'where ' + where;

  let sorting = '';
  if (params.post.sorting && params.post.sorting.length)
    sorting = 'order by ' + params.post.sorting.map(k => k.column + ' ' + sortDirToStr(k.dir)).join(', ');

  conn.query(`drop table if exists ${tableId}`, (err) => {
    if (!err) {
      conn.query(`create TEMPORARY table ${tableId} as select * from ${params.get.name} ${where} ${sorting}`, (err) => {
        if (!err) {
          conn.query(`select count(*) from ${tableId}`, (err, rows) => {
            if (!err) {
              let row = rows[0]['count(*)'];
              if (row != null)
                info.rows = +row;
              resolve(info);
            } else {
              console.log(err);
              resolve(err);
            }
          });
        } else {
          console.log(err);
        }
      });
    } else {
      console.log(err);
    }
  });
});

function sortDirToStr(dir: SortDir) {
  if (dir == SortDir.asc)
    return 'asc';
  else if (dir == SortDir.desc)
    return 'desc';
  return '';
}

srv.addJsonHandler<{id: string, start: number, count: number}, Params>('/handler/table-data', (params, resolve) => {
    let offset = '';
    let limit = `limit 10`;
    if (params.get.start != null) {
      offset = 'offset ' + params.get.start;
    }

    if (params.get.count != null) {
      limit = 'limit ' + params.get.count;
    }

    let columns = '*';
    if (params.post.columns && params.post.columns.length) {
      columns = params.post.columns.join(', ');
    }

    let select = `select ${columns} from ${params.get.id} ${limit} ${offset}`;

    console.log(select);
    conn.query(select, (err, rows) => {
      if (!err) {
        resolve(rows.map(row => Object.keys(row).map(key => row[key])));
      } else {
        console.log(err);
        resolve(err);
      }
    });
});