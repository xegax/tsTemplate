import * as http from 'http';
import {createServer} from './server';
import {Database} from 'sqlite3';
import {FilterCondition, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from '../table/filter-condition';
import {SortColumn, SortDir} from '../common/table';

var srv = createServer(8088);

interface Params {
  table: string;
  columns: Array<string>;
  sorting: Array<SortColumn>;
  filter: FilterCondition;
}

let db = new Database('data/books.db', (err) => {
  if (err)
    console.log(err);
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

srv.addJsonHandler<{name: string}, Params>('/handler/table-info', (params, resolve) => {
  db.serialize(() => {
    let tableId = 'tmpT1';

    const info = {
      rows: 0,
      columns: [],
      id: tableId
    };
    db.get(`select * from ${params.get.name} limit 1`, (err, row) => {
      if (!err) {
        info.columns = Object.keys(row);
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

    db.exec(`drop table if exists ${tableId}`, (err) => {
      if (err)
        console.log(err);
    });
    
    db.exec(`create temp table ${tableId} as select * from ${params.get.name} ${where} ${sorting}`, (err) => {
      if (err)
        console.log(err);
    });

    db.get(`select count(*) from ${tableId}`, (err, row) => {
      if (!err) {
        let rows = row['count(*)'];
        if (rows != null)
          info.rows = +rows;
        resolve(info);
      } else {
        console.log(err);
        resolve(err);
      }
    });
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
  db.serialize(() => {
    let offset = '';
    let limit = `limit 10`;
    if (params.get.start != null) {
      offset = 'offset ' + params.get.start;
    }

    if (params.get.count != null) {
      limit = 'limit ' + params.get.count;
    }

    let select = `select * from ${params.get.id} ${limit} ${offset}`;

    console.log(select);
    db.all(select, (err, rows) => {
      if (!err) {
        resolve(rows.map(row => Object.keys(row).map(key => row[key])));
      } else {
        console.log(err);
        resolve(err);
      }
    });
  });
});