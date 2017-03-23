import * as http from 'http';
import {createServer} from './server';
import {createConnection} from 'mysql';
import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../table/filter-condition';
import {SortColumn, SortDir} from '../common/table';
import {Table} from './table';

var srv = createServer(8088);

interface Params {
  table: string;
  columns: Array<string>;
  sorting: Array<SortColumn>;
  filter: FilterCondition;
  distinct: string;
}

/*let conn = createConnection({host: 'localhost', port: 3306, user: 'root', database: 'booksdb'});
conn.connect((err) => {
  if (err) {
    console.log(err);
  }
});*/

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

/*srv.addJsonHandler<{id: string}, Params>('/handler/columns', (params, resolve) => {
  conn.query(`show columns from ${params.get.id}`, (err, rows: Array<Object>) => {
    if (!err) {
      resolve(rows.map(row => [row['Field'], row['Type']]));
    } else {
      console.log(err);
      resolve(err);
    }
  });
});*/

// table -> 
//   t1 -> sort, filter -> t1ready
//   t2
//

/*srv.addJsonHandler<{}, {table: string, column: string}>('/handler/table-distinct', (params, resolve) => {
  const col = params.post.column;
  const tableId = 'tmpT2';
  const table = params.post.table;
  const info = {
    rows: 0,
    columns: [col, 'count'],
    id: tableId
  };
  conn.query(`drop table if exists ${tableId}`, (err) => {
    conn.query(`create TEMPORARY table ${tableId} as select ${col}, count(${col}) as count from ${table} group by ${col} order by count desc`, (err, rows) => {
      if (!err) {
        conn.query(`select count(*) as rows from ${tableId}`, (err, rows) => {
          if (!err) {
            let rowNum = rows[0]['rows'];
            if (rowNum != null)
              info.rows = +rowNum;
            resolve(info);
          } else {
            console.log(err);
            resolve(err);
          }
        });
      } else {
        console.log(err);
        resolve(err);
      }
    });
  });
});*/

let tableMap: {[name: string]: Table} = {};

// t1 -> sort -> t2, t3, t4, t5, t6
// root -> sort -> t2
// root -> sort -> root
// books(nonparent) -> sort -> tmp1
// tmp1 -> sort -> tmp1
// tmp1 -> distinct -> tmp2(nonparent)

srv.addJsonHandler<{name: string, subtable: number}, Params>('/handler/table-info', (params, resolve) => {
  let table = tableMap[params.get.name];
  
  if (!table || +params.get.subtable || !table.getParent()) {
    table = new Table(params.get.name);
    table.getSubtable(params.post).then(subtable => {
      tableMap[subtable.getName()] = subtable;
      resolve({
        id: subtable.getName(),
        rows: subtable.getRows(),
        columns: subtable.getColumns().map(col => col[0])
      });
    }).catch(resolve);
  } else {
    table.setParams(params.post).then(() => {
      resolve({
        id: table.getName(),
        rows: table.getRows(),
        columns: table.getColumns().map(col => col[0])
      });
    }).catch(resolve);
  }
});

srv.addJsonHandler<{id: string, start: number, count: number}, Params>('/handler/table-data', (params, resolve) => {
  const {id, start, count} = params.get;
  let table = tableMap[id];
  
  table.getData(start, count, params.post.columns)
    .then(data => {
      resolve(data);
    }).catch(resolve);
});