import {
  TableRange,
  CachedTableData,
  fillCache
} from 'table/cached-table-data';
import {TableData, TableParams} from 'table/table-data';
import {JSONTableData} from 'table/json-table-data';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {assign} from 'lodash';

interface TableInfo {
  rows: number;
  columns: Array<string>;
  id: string;
}

interface LoadTableParams {
  table: string;
  requestor?: Requestor;
  params?: TableParams;
}

export function loadTable(table: string, params?: TableParams, requestor?: Requestor): Promise<TableData> {
  requestor = requestor || getGlobalRequestor();
  return requestor.sendData('/handler/table-info', {name: table},
    JSON.stringify({})
  ).then(data => {
    let info: TableInfo = JSON.parse(data);
    let origin = new ServerTableData(info, requestor, table);
    if (!params)
      return origin;
    
    return origin.setParams(params);
  });
}

class ServerTableData extends CachedTableData {
  private info: TableInfo;
  private requestor: Requestor;
  private name: string;
  private parent: ServerTableData;

  constructor(info: TableInfo, requestor: Requestor, name: string) {
    super(info.rows, info.columns.length);
    this.requestor = requestor;
    this.info = info;
    this.name = name;

    this.columns = new JSONTableData(info.columns.map(name => [name]), ['name']);
  }

  requestTableData(subtable: boolean, params?: TableParams): Promise<TableData> {
    return new Promise(resolve => {
      const info = assign({}, this.info);
      if (params.columns) {
        if (params.columns.length) {  // задаём порядок и список колонок
          info.columns = params.columns.slice();
          
          // убираем все не валидные колонки
          if (this.parent)
            info.columns = info.columns.filter(name => this.parent.info.columns.indexOf(name) != -1);
        }
        
        if (this.parent && params.columns.length == 0) { // берём исходный список колонок
          info.columns = this.parent.info.columns.slice();
        }
      }

      if (params.distinct) {
        this.requestor.sendData('/handler/table-info', {name: this.info.id, subtable: subtable ? 1 : 0},
          JSON.stringify({filter: params.filter, sorting: params.sort, distinct: params.distinct})
        ).then(data => {
          let srvInfo: TableInfo = JSON.parse(data);
          let table = new ServerTableData(srvInfo, this.requestor, this.name);
          resolve(table);
        });
      } else if ('sort' in params || 'filter' in params) {
        this.requestor.sendData('/handler/table-info', {name: this.info.id, subtable: subtable ? 1 : 0}, 
          JSON.stringify({
            filter: params.filter,
            sorting: params.sort
          })).then(data => {
            let srvInfo: TableInfo = JSON.parse(data);
            srvInfo.columns = info.columns;
            let table = new ServerTableData(srvInfo, this.requestor, this.name);
            table.parent = this.parent || this;
            resolve(table);
          });
      } else {
        const table = new ServerTableData(info, this.requestor, this.name);
        table.parent = this.parent || this;
        setTimeout(() => resolve(table), 1);
      }
    });
  }

  createSubtable(params?: TableParams) {
    return this.requestTableData(true, params);
  }

  setParams(params?: TableParams) {
    return this.requestTableData(false, params);
  }

  getParent(): TableData {
    return this.parent;
  }

  protected loadCacheRange(block, range: TableRange): Promise<any> {
    return this.requestor.sendData('/handler/table-data', {
        id: this.info.id, start: range.rows[0], count: (range.rows[1] - range.rows[0]) + 1
      }, JSON.stringify({columns: this.info.columns}))
      .then((data) => {
        data = JSON.parse(data);
        fillCache(block, range, (row, col, relRow, relCol) => {
          let cell = data[relRow][relCol];
          const raw = cell;

          if (cell == null) {
            cell = 'null';
          } else {
            cell = cell.toString();
          }
          return {text: cell, raw}
        });
      });
  }
}