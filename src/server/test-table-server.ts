import * as http from 'http';
import {createServer} from './server';
import {FilterCondition} from '../table/filter-condition';
import {SortColumn} from '../common/table';
import {getTableMaker, Table} from './table/table';

var srv = createServer(8088);
const makeTable = getTableMaker('sqlite');

interface Params {
  columns: Array<string>;
  sorting: Array<SortColumn>;
  filter: FilterCondition;
  distinct: string;
}

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
    table = makeTable(params.get.name);
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