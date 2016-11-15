import {Publisher} from 'common/publisher';
import {parsePath} from 'common/common';
import {assign} from 'lodash';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';

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

interface Dimension {
  // item indexes, but aligned to itemsPerBuffer
  buffer: Array<number>;

  itemsPerBuffer: number;

  // requested range
  range: Array<number>;

  // total possible items
  total: number;
}

abstract class TableModelImpl extends Publisher {
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

  private buffer = Array<Array<Cells>>();  // [column][row]

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
    
    if (colsChanged || rowsChanged)
      this.updateCells(this.columns.buffer, this.rows.buffer);
  }

  protected updateDimension(dim: Dimension, range: Array<number>): boolean {
    if (dim.range[0] != range[0] || dim.range[1] != range[1]) {
      dim.range[0] = range[0];
      dim.range[1] = range[1];
    }

    let itemsPerBuffer = Math.max(dim.itemsPerBuffer, range[1] - range[0] + 1);
    if (itemsPerBuffer != dim.itemsPerBuffer) {
      dim.itemsPerBuffer = itemsPerBuffer;
      this.buffer.splice(0, this.buffer.length);
    }

    let buffer = dim.range.slice();
    buffer[0] = Math.floor(buffer[0] / dim.itemsPerBuffer) * dim.itemsPerBuffer;
    buffer[1] = Math.floor(buffer[1] / dim.itemsPerBuffer) * dim.itemsPerBuffer + dim.itemsPerBuffer - 1;
    buffer[1] = Math.min(buffer[1], dim.total - 1);

    if (buffer[0] == dim.buffer[0] && buffer[1] == dim.buffer[1])
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
    row -= this.rows.buffer[0];
    col -= this.columns.buffer[0];

    if (!this.currCells || col >= this.currCells.length || row >= this.currCells[col].length)
      return {
        value: '?'
      };

    return {
      value: this.currCells[col][row].value
    };
  }

  protected abstract updateCells(cols: Array<number>, rows: Array<number>);

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
      this.setTotal(header.columns.length, header.rows);
    });
  }

  private getFilePartUrl(n: number): string {
    return this.headerPath + this.header.fileName.replace('%d', '' + n);
  }

  private getBuffersFromRows(rows: Array<number>): Array<number> {
    return [
      Math.floor(rows[0] / this.rows.itemsPerBuffer),
      Math.floor(rows[1] / this.rows.itemsPerBuffer)
    ];
  }

  // buffer ready to work
  private hasBuffer(idx: number) {
    return this.buffs[idx] != null && this.buffs[idx].cells != null;
  }

  protected getBuffer(idx: number): Cells {
    return this.buffs[idx].cells;
  }

  protected setBuffer(idx: number, cells: Cells) {
    this.buffs[idx] = {cells};
  }

  protected getBufferRowsRange(idx: number): Array<number> {
    return [
      idx * this.rows.itemsPerBuffer,
      Math.min(idx * this.rows.itemsPerBuffer + this.rows.itemsPerBuffer - 1, this.rows.total - 1)
    ];
  }

  getCell(col: number, row: number): Cell {
    col -= this.columns.buffer[0];
    const buff = Math.floor(row / this.rows.itemsPerBuffer);

    if (!this.hasBuffer(buff))
      return {
        value: '?'
      };

    return {
      value: this.getBuffer(buff)[col][row - buff * this.rows.itemsPerBuffer].value
    };
  }

  protected loadBuffers(buffIndexes: Array<number>) {
    buffIndexes.forEach(idx => {
      if (this.hasBuffer(idx))
        return this.updateVersion(TableModelEvent.ROWS_SELECTED, 1);

      // loading is started
      if (this.buffs[idx] && this.buffs[idx].cells == null)
        return;

      this.setBuffer(idx, null);
      this.requestor.getJSON(this.getFilePartUrl(idx)).then((data: Array<Array<any>>) => {
        const columns = data[0].length;
        const rows = this.getBufferRowsRange(idx);
        let cells = Array<Array<Cell>>(columns);
        for (let c = 0; c < cells.length; c++) {
          let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
          for (let r = 0; r < rowArr.length; r++) {
            try {
              rowArr[r] = {
                value: '' + data[r][c]
              };
            } catch (e) {
              console.log(e);
            }
          }
        }
        this.setBuffer(idx, cells);
        this.updateVersion(TableModelEvent.ROWS_SELECTED, 1);
      });
    });
  }

  protected updateCells(columns: Array<number>, rows: Array<number>) {
    let buffs = this.getBuffersFromRows(rows);
    this.loadBuffers(buffs);
    console.log(buffs, rows);
  }
}
