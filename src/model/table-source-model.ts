import {Publisher} from '../common/publisher';
import {parsePath} from '../common/common';
import {assign} from 'lodash';
import {Requestor, getGlobalRequestor} from '../requestor/requestor';
import {Timer} from '../common/timer';
import {IThenable} from 'promise';
import {CompoundCondition, ColumnCondition, Filterable, FilterCondition} from '../model/filter-condition';

export enum SortDir {
  asc = 1,
  desc,
  natural
};

export interface SortColumn {
  column: string;
  dir: SortDir
}

export interface Sortable {
  setColumns(columns: Array<SortColumn>);
  getColumns(): Array<SortColumn>;
}

export enum ColumnType {
  cat = 1,
  num = 2,
  text = 3
};

export interface Column {
  id: string;
  type: ColumnType;
}

export const enum TableModelEvent {
  COLUMNS_SELECTED = 1 << 0,
  ROWS_SELECTED = 1 << 1,
  TOTAL = 1 << 2,
  SORTING = 1 << 3,
  FILTERING = 1 << 4
}

export interface Cell {
  value: string;
  raw: any;
}

export type Cells = Array<Array<Cell>>;

interface Total {
  rows: number;
  columns: number;
}

export interface DataRange {
  cols?: Array<number>;
  rows?: Array<number>;
}

export enum Abilities {
  Conditions = 1 << 1,
  Sorting = 1 << 2
};

export interface TableSourceModel {
  // load data
  loadData(range: DataRange): IThenable<any>;

  reload();

  // return total rows number and total columns number
  getTotal(): Total;

  // get range of requested columns
  getColumnsRange(): Array<number>;
  
  // get range of requested rows
  getRowsRange(): Array<number>;

  getCell(col: number, row: number): Cell;

  getColumn(col: number): Column;
  getColumnIdx(colId: string): number;

  // select columns and order
  setColumnsAndOrder(columns: Array<string>);
  getColumnsAndOrder(): Array<string>;

  getSorting(): Sortable;
  getFiltering(): Filterable;

  // filtering
  getAbilities(): number;
  getUniqueValues(col: number): TableSourceModel;

  getPublisher(): Publisher;
}

export interface Dimension {
  // buffer indexes range
  buffer: Array<number>;

  itemsPerBuffer: number;

  // requested range
  range: Array<number>;

  // total possible items
  total: number;
}

export enum DimensionEnum {
  Column = 0,
  Row = 1
};

export interface CacheItem {
  cells: Cells;
}

export type CacheVisitor = (visit: (colCache: number, rowCache: number, cache: CacheItem, colsCache: Array<Column>) => void) => void;

class SortDataHolder implements Sortable {
  private columns = Array<SortColumn>();
  private publisher: Publisher;

  constructor(publisher: Publisher) {
    this.publisher = publisher;
  }

  setColumns(columns: Array<SortColumn>) {
    this.columns = columns;
    this.publisher.updateVersion(TableModelEvent.SORTING, 5);
  }

  getColumns(): Array<SortColumn> {
    return this.columns;
  }
}

class FilterDataHolder implements Filterable {
  private publisher: Publisher;
  private condition: FilterCondition;

  constructor(publisher: Publisher) {
    this.publisher = publisher;
  }

  setConditions(condition: FilterCondition) {
    this.condition = condition;
    this.publisher.updateVersion(TableModelEvent.FILTERING, 5);
  }

  getConditions(): FilterCondition {
    return this.condition;
  }
}

export class TableSourceModelImpl implements TableSourceModel {
  protected columns: Dimension = {
    itemsPerBuffer: 0,
    buffer: Array<number>(2),
    range: Array<number>(2),
    total: 0
  };

  protected rows: Dimension = {
    itemsPerBuffer: 0,
    buffer: Array<number>(2),
    range: Array<number>(2),
    total: 0
  };

  protected publisher: Publisher = new Publisher();
  protected sorting = new SortDataHolder(this.publisher);
  protected filtering = new FilterDataHolder(this.publisher);
  protected columnsCache = Array< Array<Column> >();
  
  private columnsOrder = Array<number>();
  private selectColumns = Array<string>();

  protected cache = Array< Array<CacheItem> >();  // [row][column]

  constructor() {
    this.publisher.addSubscriber((mask: number) => {
      if (mask & (TableModelEvent.SORTING))
        this.reload();
    });
  }

  getPublisher(): Publisher {
    return this.publisher;
  }

  loadData(_range: DataRange): IThenable<any> {
    const range: DataRange = {
      cols: _range.cols || this.columns.range.slice(),
      rows: _range.rows || this.rows.range.slice()
    };
    
    if (this.columns.total == 0 || this.rows.total == 0)
      return;

    for (let n = 0; n < 2; n++) {
      range.rows[n] = range.rows[n] || 0;
      range.cols[n] = range.cols[n] || 0;
    }

    if (range.cols[1] - range.cols[0] < 0 || range.rows[1] - range.rows[0] < 0)
      return;

    const colsChanged = this.updateDimension(this.columns, range.cols);
    const rowsChanged = this.updateDimension(this.rows, range.rows);
    
    if (!colsChanged && !rowsChanged)
      return;

    const notify = () => {
      this.publisher.updateVersion(TableModelEvent.ROWS_SELECTED|TableModelEvent.COLUMNS_SELECTED, 1);
    }

    const promise = this._updateCacheImpl(this.columns.buffer, this.rows.buffer);
    if (promise) {
      return promise.then(notify);
    } else {
      return new Promise(resolve => {
        notify();
      });
    }
  }

  reload() {
    this.cache = [];
    //this.columnsCache = [];
    this.rows.buffer = [];
    this.columns.buffer = [];
    this.loadData({cols: this.columns.range, rows: this.rows.range});
  }

  getCellsRange(dimId: DimensionEnum, cacheRange: Array<number>): Array<number> {
    let dim = (dimId == DimensionEnum.Column) ? this.columns : this.rows;
    const first = Math.min(cacheRange[0] * dim.itemsPerBuffer, dim.total - 1);
    let last = (cacheRange.length == 1 ? cacheRange[0] : cacheRange[1]) * dim.itemsPerBuffer + dim.itemsPerBuffer;
    last = Math.min(last, dim.total) - 1;
    return [first, last];
  }

  protected updateDimension(dim: Dimension, range: Array<number>): boolean {
    if (dim.range[0] != range[0] || dim.range[1] != range[1]) {
      dim.range[0] = range[0];
      dim.range[1] = range[1];
    }

    let changed = 0;
    let itemsPerBuffer = Math.max(dim.itemsPerBuffer, range[1] - range[0] + 1);
    if (itemsPerBuffer != dim.itemsPerBuffer) {
      dim.itemsPerBuffer = itemsPerBuffer;
      this.cache.splice(0, this.cache.length);
      if (dim == this.columns)
        this.columnsCache.splice(0, this.columnsCache.length);
      changed++;
    }

    let buffer = dim.range.slice();
    buffer[0] = Math.floor(buffer[0] / dim.itemsPerBuffer);
    buffer[1] = Math.floor(buffer[1] / dim.itemsPerBuffer);

    if (changed == 0 && buffer[0] == dim.buffer[0] && buffer[1] == dim.buffer[1])
      return false;

    dim.buffer = buffer;
    return true;
  }

  getTotal(): Total {
    return {
      columns: this.columnsOrder.length ? this.columnsOrder.length : this.columns.total,
      rows: this.rows.total
    };
  }

  getColumnsRange(): Array<number> {
    return this.columns.range.slice();
  }

  getRowsRange(): Array<number> {
    return this.rows.range.slice();
  }

  getCellByColName(colId: string, row: number): Cell {
    return this.getCell(this.getColumnIdx(colId), row);
  }

  getCell(col: number, row: number): Cell {
    let empty = {value: '', raw: null};
    if (this.columns.itemsPerBuffer == 0 || this.rows.itemsPerBuffer == 0) {
      return empty;
    }

    try {
      if (this.columnsOrder.length)
        col = this.columnsOrder[col];

      const colBuff = Math.floor(col / this.columns.itemsPerBuffer);
      const rowBuff = Math.floor(row / this.rows.itemsPerBuffer);

      const item = this.cache[rowBuff][colBuff].cells;

      col -= colBuff * this.columns.itemsPerBuffer;
      row -= rowBuff * this.rows.itemsPerBuffer;

      if (col >= 0 && col < item.length && row >= 0 && row < item[col].length) {
        return item[col][row];
      }
    } catch(e) {
      return empty;
    }
    return empty;
  }

  getColumn(col: number): Column {
    let empty = {id: '', type: -1};
    if (this.columns.itemsPerBuffer == 0)
      return empty;

    try {
      if (this.columnsOrder.length)
        col = this.columnsOrder[col];

      const colBuff = Math.floor(col / this.columns.itemsPerBuffer);
      const cols = this.columnsCache[colBuff];
      col -= colBuff * this.columns.itemsPerBuffer;
      if (col >= 0 && col < cols.length)
        return cols[col];
    } catch(e) {
      return empty;
    }
    return empty;
  }

  setColumnsAndOrder(columns: Array<string>) {
    this.selectColumns = columns;
    if (this.columnsCache.length == 0)
      return;

    this.updateColumnsOrder();
    this.publisher.updateVersion(TableModelEvent.TOTAL, 1);
  }

  getColumnsAndOrder(): Array<string> {
    return this.selectColumns;
  }

  protected createOrGetCacheItem(col: number, row: number): CacheItem {
    let cachedRow = this.cache[row] || (this.cache[row] = Array<CacheItem>());
    return cachedRow[col] || (cachedRow[col] = {cells: null});
  }

  protected createOrGetColsCacheItem(col: number): Array<Column> {
    return this.columnsCache[col] || (this.columnsCache[col] = Array<Column>());
  }

  protected getCacheItem(col: number, row: number): CacheItem {
    if (this.cache[row] && this.cache[row][col])
      return this.cache[row][col];
    return null;
  }

  protected _updateCacheImpl(colsCache: Array<number>, rowsCache: Array<number>): IThenable<any> {
    return this.updateCache((visit: (col, row, cache, colsCache) => void) => {
      for(let r = 0; r < rowsCache.length; r++) {
        for(let c = 0; c < colsCache.length; c++) {
          visit(
            colsCache[c],
            rowsCache[r],
            this.createOrGetCacheItem(colsCache[c], rowsCache[r]),
            this.createOrGetColsCacheItem(colsCache[c])
          );
        }
      }
    });
  }

  protected updateCache(visitor: CacheVisitor): IThenable<any> {
    return null;
  }

  protected updateColumnsOrder() {
    this.columnsOrder = [];
    this.columnsOrder = this.selectColumns.map(col => this.getColumnIdx(col)).filter(n => n != -1);
  }

  protected setTotal(columns: number, rows: number) {
    this.columns.total = columns;
    this.rows.total = rows;

    this.publisher.updateVersion(TableModelEvent.TOTAL, 1);
  }

  protected fillCacheCol(cacheCol: number, getCacheCol: (relCol: number, absCol: number) => Column) {
    let colsRange = this.getCellsRange(DimensionEnum.Column, [cacheCol, cacheCol]);
    let cols = this.columnsCache[cacheCol] || (this.columnsCache[cacheCol] = []);
    for (let c = 0; c < colsRange[1] - colsRange[0] + 1; c++) {
      try {
        cols[c] = getCacheCol(c, colsRange[0] + c);
      } catch (e) {
        console.log(e);
      }
    }
    this.updateColumnsOrder();
  }

  protected fillCache(cacheCol: number, 
                      cacheRow: number,
                      cache: Cells,
                      getCacheData: (relCol: number, relRow: number, absCol: number, absRow: number) => any) {
    let cacheRows = this.getCellsRange(DimensionEnum.Row, [cacheRow, cacheRow]);
    let cacheCols = this.getCellsRange(DimensionEnum.Column, [cacheCol, cacheCol]);

    for (let c = 0; c < cacheCols[1] - cacheCols[0] + 1; c++) {
      let rowArr = cache[c] = Array<Cell>(cacheRows[1] - cacheRows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          let raw = getCacheData(c, r, cacheCols[0] + c, cacheRows[0] + r);
          rowArr[r] = {
            value: raw.toString(),
            raw
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  getColumnIdx(colId: string): number {
    const total = this.getTotal();
    for(let n = 0; n < total.columns; n++) {
      const col = this.getColumn(n);
      if (col.id == colId)
        return n;
    }

    return -1;
  }

  getAbilities(): number {
    return 0;
  }

  getUniqueValues(col: number): TableSourceModel {
    return null;
  }

  getSorting(): Sortable {
    return this.sorting;
  }

  getFiltering(): Filterable {
    return this.filtering;
  }
}
