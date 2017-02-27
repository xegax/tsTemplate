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
  SortDir,
  TableModelEvent
} from 'model/table-source-model';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {parsePath} from 'common/common';
import {Publisher} from 'common/publisher';
import {Timer} from 'common/timer';
import {assign} from 'lodash';

interface TableInfo {
  rows: number;
  columns: Array<string>;
  types: Array<ColumnType>;
  id: string;
}

interface Config {
  srcHandler: string;
  srcName: string;
  rowsPerBuffer?: number;
  requestor?: Requestor;
}

export class JSONServerSourceModel extends TableSourceModelImpl {
  private srcHandler = '';
  private srcName: string;
  private requestor: Requestor;
  private cacheUpdaterArr = Array<() => void>();
  private rowsPerBuffer: number;
  private id: string = '';
  private timer: Timer = new Timer(() => {
    this.cacheUpdaterArr.reverse().forEach(updater => updater());
    this.cacheUpdaterArr.splice(0, this.cacheUpdaterArr.length);
  });
  private clone: JSONServerSourceModel;
  private info: TableInfo;

  constructor(config: Config | JSONServerSourceModel) {
    super();

    new Timer(() => {
      if (config instanceof JSONServerSourceModel)
        this.initFromClone(config as JSONServerSourceModel);
      else
        this.initFromConfig(config);
    }).run(1);
  }

  protected initFromConfig(config: Config) {
    config = assign<Config>({
      requestor: getGlobalRequestor(),
      rowsPerBuffer: 300
    }, config);

    this.requestor = config.requestor;
    this.srcHandler = config.srcHandler;
    this.srcName = config.srcName;
    this.rowsPerBuffer = config.rowsPerBuffer;

    this.updateInfo(false);
  }

  reload(mask: number) {
    this.cache = [];
    this.rows.buffer = [];
    this.columns.buffer = [];
    if (mask & (TableModelEvent.FILTERING | TableModelEvent.SORTING)) {
      this.updateInfo(true);
    } else {
      this.loadData({cols: this.columns.range, rows: this.rows.range});
    }
  }

  protected initFromClone(clone: JSONServerSourceModel) {
    this.clone = clone;
    
    const total = clone.getTotal();
    if (clone.info) {
      this.setTotal(clone.info.columns.length, total.rows);
      this.columns.itemsPerBuffer = clone.info.columns.length;
      this.fillCacheCol(0, (relCol, absCol) => {
        return {id: clone.info.columns[absCol], type: ColumnType.text};
      });
    }
    this.rows.itemsPerBuffer = clone.rowsPerBuffer;

    clone.getPublisher().addSubscriber(mask => {
      if (mask & TableModelEvent.TOTAL) {
        const total = clone.getTotal();
        this.setTotal(clone.info.columns.length, total.rows);
        this.columns.itemsPerBuffer = clone.info.columns.length;
        this.fillCacheCol(0, (relCol, absCol) => {
          return {id: clone.info.columns[absCol], type: ColumnType.text};
        });
      }

      if (mask & (TableModelEvent.FILTERING|TableModelEvent.SORTING)) {
        this.cache = [];
        this.rows.buffer = [];
        this.columns.buffer = [];
      }

      if (mask & (TableModelEvent.FILTERING_FINISHED|TableModelEvent.SORTING_FINISHED)) {
        this.reload(0);
      }
    });
  }

  protected updateInfo(reload: boolean) {
    let columns = this.getColumnsAndOrder();
    this.requestor.sendData(this.srcHandler + '/table-info', {name: this.srcName}, JSON.stringify({
      filter: this.getFiltering().getConditions(),
      sorting: this.getSorting().getColumns(),
    })).then((data) => {
      var info: TableInfo = this.info = JSON.parse(data);
      this.id = info.id;
      this.rows.itemsPerBuffer = this.rowsPerBuffer;

      if (columns.length == 0)
        columns = info.columns;

      this.columns.itemsPerBuffer = columns.length;
      this.setTotal(columns.length, info.rows);
      this.fillCacheCol(0, (relCol, absCol) => {
        return {id: columns[absCol], type: ColumnType.text};
      });

      if (reload) {
        this.reload(0);
        this.getPublisher().updateVersion(TableModelEvent.FILTERING_FINISHED|TableModelEvent.SORTING_FINISHED, 1);
      }
    });
  }

  protected updateCacheImpl(visit: CacheVisitor, callback: () => void) {
    visit((cacheCol: number, cacheRow: number, cache, cacheCols: Array<Column>) => {
      if (cache.cells != null)  // запрос уже сделан, ожидаем ответ
        return;

      const ref = this.clone || this;
      cache.cells = [];
      const count = this.rows.itemsPerBuffer;
      const start = cacheRow * count;
      const columns = this.getColumnsAndOrder();
      ref.requestor.sendData(ref.srcHandler + '/table-data', {
        id: ref.id, start, count
      }, JSON.stringify({columns})).then(data => {
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
      arr.push(this.makeUpdater(() => {
        resolve(null);
      }, visit));
      if (arr.length > 2) {
        this.cacheUpdaterArr = arr.slice(arr.length - 2);
      }
      this.timer.run(100);
    });
  }

  makeClone(): TableSourceModel {
    return new JSONServerSourceModel(this);
  }
}