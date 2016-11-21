import {Publisher} from 'common/publisher';
import {parsePath} from 'common/common';
import {assign} from 'lodash';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {Timer} from 'common/timer';
import {IThenable} from 'promise';

export interface Column {
  id: number;
  label: string;
}

export const enum TableModelEvent {
  COLUMNS_SELECTED = 1 << 0,
  ROWS_SELECTED = 1 << 1,
  TOTAL = 1 << 2
}

export interface Cell {
  value: any;
}

export type Cells = Array<Array<Cell>>;

interface Total {
  rows: number;
  columns: number;
}

interface DataRange {
  cols?: Array<number>;
  rows?: Array<number>;
}

export interface TableSourceModel {
  // load data
  loadData(range: DataRange);

  reload();

  // return total rows number and total columns number
  getTotal(): Total;

  // get loaded columns
  //getColumns(): Array<Column>;

  // get range of requested columns
  getColumnsRange(): Array<number>;
  
  // get range of requested rows
  getRowsRange(): Array<number>;

  getCell(col: number, row: number): Cell;
  //getColumn(col: number): Column;

  addSubscriber(callback: (mask: number) => void);
  removeSubscriber(callback: (mask: number) => void);
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

export type CacheVisitor = (visit: (colCache: number, rowCache: number) => void) => void;

export class TableSourceModelImpl extends Publisher implements TableSourceModel {
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

  protected cache = Array< Array<CacheItem> >();  // [row][column]
  protected empty = {
    value: '?'
  };

  loadData(_range: DataRange) {
    const range: DataRange = {
      cols: _range.cols || this.columns.range.slice(),
      rows: _range.rows || this.rows.range.slice()
    };
    
    if (range.cols[1] - range.cols[0] <= 0 || range.rows[1] - range.rows[0] <= 0)
      return;

    const colsChanged = this.updateDimension(this.columns, range.cols);
    const rowsChanged = this.updateDimension(this.rows, range.rows);
    
    if (!colsChanged && !rowsChanged)
      return;
    
    const notify = () => {
      this.updateVersion(TableModelEvent.ROWS_SELECTED|TableModelEvent.COLUMNS_SELECTED, 1);
    }

    const promise = this._updateCacheImpl(this.columns.buffer, this.rows.buffer);
    if (promise) {
      promise.then(notify);
    } else {
      notify();
    }
  }

  reload() {
    this.cache = [];
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
      columns: this.columns.total,
      rows: this.rows.total
    };
  }

  getColumnsRange(): Array<number> {
    return this.columns.range.slice();
  }

  getRowsRange(): Array<number> {
    return this.rows.range.slice();
  }

  getCell(col: number, row: number): Cell {
    if (this.columns.itemsPerBuffer == 0 || this.rows.itemsPerBuffer == 0) {
      return this.empty;
    }

    try {
      const colBuff = Math.floor(col / this.columns.itemsPerBuffer);
      const rowBuff = Math.floor(row / this.rows.itemsPerBuffer);

      const item = this.cache[rowBuff][colBuff].cells;

      col -= colBuff * this.columns.itemsPerBuffer;
      row -= rowBuff * this.rows.itemsPerBuffer;

      if (col >= 0 && col < item.length && row >= 0 && row < item[col].length) {
        return item[col][row];
      }
    } catch(e) {
      return this.empty;
    }
    return this.empty;
  }

  protected createOrGetCacheItem(col: number, row: number): CacheItem {
    let cachedRow = this.cache[row] || (this.cache[row] = Array<CacheItem>());
    return cachedRow[col] || (cachedRow[col] = {cells: null});
  }

  protected getCacheItem(col: number, row: number): CacheItem {
    if (this.cache[row] && this.cache[row][col])
      return this.cache[row][col];
    return null;
  }

  protected _updateCacheImpl(cols: Array<number>, rows: Array<number>): IThenable<any> {
    return this.updateCache((visit: (col, row) => void) => {
      rows.forEach(row => {
        cols.forEach(col => {
          visit(col, row);
        });
      });
    });
  }

  protected updateCache(visitor: CacheVisitor): IThenable<any> {
    return null;
  }

  protected setTotal(columns: number, rows: number) {
    this.columns.total = columns;
    this.rows.total = rows;
    this.updateVersion(TableModelEvent.TOTAL, 1);
  }
}

export class TestTableModel extends TableSourceModelImpl {
  protected delay: number;

  constructor(cols: number, rows: number, delay: number = 0) {
    super();
    this.delay = delay;
    this.setTotal(cols, rows);
  }

  protected fillCells(col: number, row: number, cells: Cells) {
    let rows = this.getCellsRange(DimensionEnum.Row, [row, row]);
    let cols = this.getCellsRange(DimensionEnum.Column, [col, col]);

    for (let c = 0; c < cols[1] - cols[0] + 1; c++) {
      let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          rowArr[r] = {
            value: '' + (rows[0] + r) + 'x' + (cols[0] + c)
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  protected updateCacheImpl(visit: CacheVisitor) {
    visit((col, row) => {
      let item = this.createOrGetCacheItem(col, row);
      this.fillCells(col, row, item.cells = []);
    });
  }

  protected updateCache(visit: CacheVisitor) {
    if (this.delay != 0) {
      return new Promise(resolve => {
        new Timer(() => {
          this.updateCacheImpl(visit);
          resolve(null);
        }).run(this.delay);
      });
    }

    this.updateCacheImpl(visit);
    return null;
  }
}

