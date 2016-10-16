import {Publisher} from 'common/publisher';
import {assign} from 'lodash';

export interface Column {
  id: number;
  label: string;
}

export const enum TableModelEvent {
  COLUMNS_SELECTED = 1 << 0,
  ROWS_SELECTED = 1 << 1,
  DIMENSION = 1 << 2
}

export interface Cell {
  value: any;
}

type Cells = Array<Array<Cell>>;

interface Dimension {
  rows: number;
  columns: number;
}

export abstract class TableModel extends Publisher {
  private columnsInBuffer = Array<number>(2);
  private rowsInBuffer = Array<number>(2);

  private selectColumns = Array<number>(2);
  private selectRows = Array<number>(2);

  private colsPerPage: number = 0;
  private rowsPerPage: number = 0;

  private currColumns = Array<Column>();
  private currCells: Cells;

  private dimension: Dimension = {
    rows: 0,
    columns: 0
  };

  selectCells(colsRange?: Array<number>, rowsRange?: Array<number>) {
    colsRange = colsRange || this.selectColumns.slice();
    rowsRange = rowsRange || this.selectRows.slice();
    if (colsRange[1] - colsRange[0] <= 0 || rowsRange[1] - rowsRange[0] <= 0)
      return;

    if (this.selectColumns[0] != colsRange[0] || this.selectColumns[1] != colsRange[1]) {
      this.selectColumns[0] = colsRange[0];
      this.selectColumns[1] = colsRange[1];
      
      this.updateColumns(this.selectColumns);
    }

    let rowsPerPage = this.rowsPerPage;
    if (this.selectRows[0] != rowsRange[0] || this.selectRows[1] != rowsRange[1]) {
      this.selectRows[0] = rowsRange[0];
      this.selectRows[1] = rowsRange[1];
    }

    this.colsPerPage = Math.max(this.colsPerPage, colsRange[1] - colsRange[0] + 1);
    this.rowsPerPage = Math.max(this.rowsPerPage, rowsRange[1] - rowsRange[0] + 1);

    let bufferCols = this.calcBufferRange(this.selectColumns, this.colsPerPage, this.dimension.columns);
    let bufferRows = this.calcBufferRange(this.selectRows, this.rowsPerPage, this.dimension.rows);

    let colsBufferEqual = bufferCols[0] == this.columnsInBuffer[0] && bufferCols[1] == this.columnsInBuffer[1];
    let rowsBufferEqual = bufferRows[0] == this.rowsInBuffer[0] && bufferRows[1] == this.rowsInBuffer[1];

    if (colsBufferEqual && rowsBufferEqual)
      return;

    this.rowsInBuffer = bufferRows;
    this.columnsInBuffer = bufferCols;
    this.updateCells(bufferCols, bufferRows);
  }

  private calcBufferRange(range: Array<number>, itemPerBuffer: number, itemCount: number): Array<number> {
    range = range.slice();
    range[0] = Math.floor(range[0] / itemPerBuffer) * itemPerBuffer;
    range[1] = Math.ceil(range[1] / itemPerBuffer) * itemPerBuffer;
    range[1] = Math.min(range[1], itemCount - 1);
    return range;
  }

  getDimension(): Dimension {
    return assign({}, this.dimension);
  }

  getCells(): Cells {
    return this.currCells;
  }

  getColumns(): Array<Column> {
    return this.currColumns;
  }

  getColumnsRange(): Array<number> {
    return this.selectColumns.slice();
  }

  getRowsRange(): Array<number> {
    return this.selectRows.slice();
  }

  getColumn(col: number): Column {
    return this.currColumns[col - this.columnsInBuffer[0]];
  }

  getCell(col: number, row: number): Cell {
    if (!this.currCells)
      return {
        value: '?'
      };

    row -= this.rowsInBuffer[0];
    col -= this.columnsInBuffer[0];
    return {
      value: this.currCells[col][row].value
    };
  }

  protected abstract updateCells(cols: Array<number>, rows: Array<number>);
  protected abstract updateColumns(range: Array<number>);

  protected setCells(cells: Cells) {
    this.currCells = cells;
    this.updateVersion(TableModelEvent.ROWS_SELECTED, 1);
  }

  protected setColumns(columns: Array<Column>) {
    this.currColumns = columns;
    this.updateVersion(TableModelEvent.COLUMNS_SELECTED, 1);
  }

  protected setDimension(columns: number, rows: number) {
    if (this.dimension.columns == columns && this.dimension.rows == rows)
      return;
    this.dimension.columns = columns;
    this.dimension.rows = rows;
    this.updateVersion(TableModelEvent.DIMENSION, 1);
  }
}

export class JSONTableModel extends TableModel {
  private json: Array<Object>;
  private columnNames = Array<string>();
  private columns = Array<Column>();

  constructor(json: Array<Object>) {
    super();
    this.json = json;

    let columns = this.columnNames = Object.keys(json[0]);
    this.columns = columns.map((label, id) => ({ id, label}));
    this.setDimension(columns.length, json.length);
  }

  protected updateColumns(range: Array<number>) {
    this.setColumns(this.columns.slice(range[0], range[1] + 1));
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