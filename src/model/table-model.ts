import {Publisher} from 'common/publisher';
import {parsePath} from 'common/common';
import {assign} from 'lodash';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {Timer} from 'common/timer';

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

type Cells = Array<Array<Cell>>;

interface Total {
  rows: number;
  columns: number;
}

interface DataRange {
  cols?: Array<number>;
  rows?: Array<number>;
}

export interface TableModel {
  // load data
  loadData(range: DataRange);

  // return total rows number and total columns number
  getTotal(): Total;

  // get loaded columns
  getColumns(): Array<Column>;

  // get range of requested columns
  getColumnsRange(): Array<number>;
  
  // get range of requested rows
  getRowsRange(): Array<number>;

  getCell(col: number, row: number): Cell;
  getColumn(col: number): Column;

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

interface BufferItem {
  cells: Cells;
}

export class TableModelImpl extends Publisher {
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

  protected buffer = Array< Array<BufferItem> >();  // [row][column]

  private currColumns = Array<Column>();
  private currCells: Cells;

  loadData(_range: DataRange) {
    const range: DataRange = {
      cols: _range.cols || this.columns.range.slice(),
      rows: _range.rows || this.rows.range.slice()
    };
    
    if (range.cols[1] - range.cols[0] <= 0 || range.rows[1] - range.rows[0] <= 0)
      return;

    const colsChanged = this.updateDimension(this.columns, range.cols);
    const rowsChanged = this.updateDimension(this.rows, range.rows);
    
    if (colsChanged || rowsChanged) {
      this.updateBuffs(this.columns.buffer, this.rows.buffer);
    }
  }

  getCellsRange(dimId: DimensionEnum, buffRange: Array<number>): Array<number> {
    let dim = (dimId == DimensionEnum.Column) ? this.columns : this.rows;
    const first = Math.min(buffRange[0] * dim.itemsPerBuffer, dim.total - 1);
    let last = (buffRange.length == 1 ? buffRange[0] : buffRange[1]) * dim.itemsPerBuffer + dim.itemsPerBuffer;
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
      this.buffer.splice(0, this.buffer.length);
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

  getCells(): Cells {
    return this.currCells;
  }

  getColumns(): Array<Column> {
    return this.currColumns;
  }

  getColumnsRange(): Array<number> {
    return this.columns.range.slice();
  }

  getRowsRange(): Array<number> {
    return this.rows.range.slice();
  }

  getColumn(col: number): Column {
    return this.currColumns[col - this.columns.buffer[0]];
  }

  getCell(col: number, row: number): Cell {
    if (this.columns.itemsPerBuffer == 0 || this.rows.itemsPerBuffer == 0) {
      return {
        value: '?'
      };
    }

    try {
      let colBuff = Math.floor(col / this.columns.itemsPerBuffer);
      let rowBuff = Math.floor(row / this.rows.itemsPerBuffer);

      let item = this.buffer[rowBuff][colBuff].cells;

      col -= colBuff * this.columns.itemsPerBuffer;
      row -= rowBuff * this.rows.itemsPerBuffer;

      if (col >= 0 && col < item.length && row >= 0 && row < item[col].length) {
        return item[col][row];
      }
    } catch(e) {
      return {
        value: '?'
      };
    }

    return {
      value: '?'
    };
  }

  protected updateBuffs(cols: Array<number>, rows: Array<number>) {
  }

  protected setCells(cells: Cells) {
    this.currCells = cells;
    this.updateVersion(TableModelEvent.ROWS_SELECTED, 1);
  }

  protected setColumns(columns: Array<Column>) {
    this.currColumns = columns;
    this.updateVersion(TableModelEvent.COLUMNS_SELECTED, 1);
  }

  protected setTotal(columns: number, rows: number) {
    this.columns.total = columns;
    this.rows.total = rows;
    this.updateVersion(TableModelEvent.TOTAL, 1);
  }
}

export class TestTableModel extends TableModelImpl {
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

  protected updateBuffs(cols: Array<number>, rows: Array<number>) {
    let callback = () => {
      rows.forEach(row => {
        let rows = this.buffer[row] || (this.buffer[row] = Array<BufferItem>());
        cols.forEach(col => {
          let cols = rows[col] || (rows[col] = {cells: Array<Array<Cell>>()});
          this.fillCells(col, row, cols.cells);
        });
      });
      this.updateVersion(TableModelEvent.ROWS_SELECTED|TableModelEvent.COLUMNS_SELECTED, 1);
    };

    if (this.delay != 0) {
      new Timer(callback).run(this.delay);
    } else {
      callback();
    }
  }
}

export class JSONTableModel extends TableModelImpl {
  private json: Array<Object>;
  private columnNames = Array<string>();

  constructor(json: Array<Object>) {
    super();
    this.json = json;

    let columns = this.columnNames = Object.keys(json[0]);
    this.setTotal(columns.length, json.length);
  }

  protected updateCells(columns: Array<number>, rows: Array<number>) {
    const data = this.json;
    const names = this.columnNames;

    let cells = Array<Array<Cell>>(columns[1] - columns[0] + 1);
    for (let c = 0; c < cells.length; c++) {
      let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          rowArr[r] = {
            value: '' + data[r + rows[0]][names[c + columns[0]]]
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
    this.setCells(cells);
  }
}

interface HeaderFileJSON {
  rows: number;
  columns: Array<string>;
  rowsPerPart: number;
  fileName: string;
}

export class JSONPartialTableModel extends TableModelImpl {
  private header: HeaderFileJSON;
  private headerPath = '';
  private buffs = Array<{cells: Cells}>();
  private requestor: Requestor;

  constructor(headerFile: string, requestor?: Requestor) {
    super();
    this.requestor = requestor || getGlobalRequestor();
    this.headerPath = parsePath(headerFile).path;

    this.requestor.getJSON(headerFile).then((data) => {
      let header = this.header = data as HeaderFileJSON;
      this.rows.itemsPerBuffer = header.rowsPerPart;
      this.columns.itemsPerBuffer = header.columns.length;
      this.setTotal(header.columns.length, header.rows);
    });
  }

  private getFilePartUrl(n: number): string {
    return this.headerPath + this.header.fileName.replace('%d', '' + n);
  }

  protected fillCells(col: number, row: number, cells: Cells, data: Array<any>) {
    let rows = this.getCellsRange(DimensionEnum.Row, [row, row]);
    let cols = this.getCellsRange(DimensionEnum.Column, [col, col]);

    let columns = this.header.columns;
    for (let c = 0; c < columns.length; c++) {
      let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          rowArr[r] = {
            value: data[r][c]
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  protected updateBuffs(colsBuff: Array<number>, rowsBuff: Array<number>) {
    colsBuff.forEach(row => {
      let rows = this.buffer[row] || (this.buffer[row] = Array<BufferItem>());
      rowsBuff.forEach(col => {
        let cols = rows[col] || (rows[col] = {cells: null});
        if (cols.cells != null)
          return;

        cols.cells = Array<Array<Cell>>();
        this.requestor.getJSON(this.getFilePartUrl(row), {}).then(data => {
          this.fillCells(col, row, cols.cells, data);
        });
      });
    });
    this.updateVersion(TableModelEvent.ROWS_SELECTED|TableModelEvent.COLUMNS_SELECTED, 1);
  }
}
