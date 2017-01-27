import {
  Cell,
  Cells,
  CacheItem,
  TableSourceModel,
  TableSourceModelImpl,
  DimensionEnum,
  CacheVisitor,
  Column,
  ColumnType,
  Sortable,
  SortColumn,
  SortDir
} from 'model/table-source-model';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {parsePath} from 'common/common';
import {Publisher} from 'common/publisher';
import {Timer} from 'common/timer';

interface TableInfo {
  rows: number;
  columns: Array<string>;
  types: Array<ColumnType>;
}

export class JSONServerSourceModel extends TableSourceModelImpl {
  private srcHandler = '';
  private srcName: string;
  private requestor: Requestor;
  private cacheUpdaterArr = Array<() => void>();
  private timer: Timer = new Timer(() => {
    this.cacheUpdaterArr.forEach(updater => updater());
  });

  constructor(srcHandler: string, srcName: string, rowsPerBuffer: number = 300, requestor?: Requestor) {
    super();
    this.requestor = requestor || getGlobalRequestor();
    this.srcHandler = srcHandler;
    this.srcName = srcName;

    this.requestor.getJSON(this.srcHandler + '/table-info', {name: srcName}).then((info: TableInfo) => {
      this.rows.itemsPerBuffer = rowsPerBuffer;
      this.columns.itemsPerBuffer = info.columns.length;
      this.setTotal(info.columns.length, info.rows);
      this.fillCacheCol(0, (relCol, absCol) => {
        return {id: info.columns[absCol], type: ColumnType.text};
      });
    });
  }

  protected updateCacheImpl(visit: CacheVisitor, callback: () => void) {
    visit((cacheCol: number, cacheRow: number, cache, cacheCols: Array<Column>) => {
      if (cache.cells != null)
        return;

      cache.cells = [];
      const startRow = cacheRow * this.rows.itemsPerBuffer;
      this.requestor.sendData(this.srcHandler + '/table-data', {
        name: this.srcName
      }, JSON.stringify({
        rowsRange: [startRow, startRow + this.rows.itemsPerBuffer - 1],
        sorting: this.getSorting().getColumns()
      })).then(data => {
        data = JSON.parse(data);
        this.fillCache(cacheCol, cacheRow, cache.cells, (c, r) => {
          const raw = data[r][c];
          return raw == null ? '' : raw;
        });
        callback && callback();
      }).catch(err => {
        console.log('error', err);
      });
    });
  }

  protected makeUpdater(resolve: (value: {}) => void, visit: CacheVisitor) {
    return () => {
      this.updateCacheImpl(visit, () => resolve(null));
    };
  }

  protected updateCache(visit: CacheVisitor) {
    return new Promise(resolve => {
      let arr = this.cacheUpdaterArr;
      arr.push(this.makeUpdater(resolve, visit));
      if (arr.length > 2)
        this.cacheUpdaterArr = arr.slice(arr.length - 2);
      this.timer.run(100);
    });
  }
}