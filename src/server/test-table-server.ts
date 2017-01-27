import * as http from 'http';
import {createServer} from './server';
import {Database} from 'sqlite3';
var srv = createServer(8088);

enum SortDir {
  asc = 1,
  desc,
  natural
};

interface SortColumn {
  column: string;
  dir: SortDir
}

interface Params {
  table: string;
  rowsRange: Array<number>;
  columns: Array<string>;
  sorting: Array<SortColumn>;
}

let db = new Database('data/books.db', (err) => {
  if (err)
    console.log(err);
});

srv.addJsonHandler<{name: string}, Params>('/handler/table-info', (params, resolve) => {
  db.serialize(() => {
    const info = {
      rows: 0,
      columns: []
    };
    db.get(`select * from ${params.get.name} limit 1`, (err, row) => {
      if (!err) {
        info.columns = Object.keys(row);
      } else {
        console.log(err);
        resolve(err);
      }
    });

    db.get(`select count(*) from ${params.get.name}`, (err, row) => {
      if (!err) {
        info.rows = +row['count(*)'];
      } else {
        console.log(err);
        resolve(err);
      }
      resolve(info);
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

srv.addJsonHandler<{name: string}, Params>('/handler/table-data', (params, resolve) => {
  db.serialize(() => {
    let columns = '*';
    if (params.post.columns)
      columns = params.post.columns.join(', ');

    let offset = '';
    let limit = `limit 10`;
    if (params.post.rowsRange) {
      limit = 'limit ' + (params.post.rowsRange[1] - params.post.rowsRange[0] + 1);
      offset = `offset ${params.post.rowsRange[0]}`;
    }

    let sorting = '';
    if (params.post.sorting && params.post.sorting.length)
      sorting = 'order by ' + params.post.sorting.map(k => k.column + ' ' + sortDirToStr(k.dir)).join(', ');
    let select = `select ${columns} from ${params.get.name} ${sorting} ${limit} ${offset}`;
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