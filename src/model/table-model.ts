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

  protected colsPerBuffer: number = 0;
  protected rowsPerBuffer: number = 0;

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

    if (this.selectRows[0] != rowsRange[0] || this.selectRows[1] != rowsRange[1]) {
      this.selectRows[0] = rowsRange[0];
      this.selectRows[1] = rowsRange[1];
    }

    this.colsPerBuffer = Math.max(this.colsPerBuffer, colsRange[1] - colsRange[0] + 1);
    this.rowsPerBuffer = Math.max(this.rowsPerBuffer, rowsRange[1] - rowsRange[0] + 1);

    let bufferCols = this.calcBufferRange(this.selectColumns, this.colsPerBuffer, this.dimension.columns);
    let bufferRows = this.calcBufferRange(this.selectRows, this.rowsPerBuffer, this.dimension.rows);

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
    range[1] = Math.floor(range[1] / itemPerBuffer) * itemPerBuffer + itemPerBuffer - 1;
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
    row -= this.rowsInBuffer[0];
    col -= this.columnsInBuffer[0];

    if (!this.currCells || col >= this.currCells.length || row >= this.currCells[col].length)
      return {
        value: '?'
      };

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

interface HeaderFileJSON {
  rows: number;
  columns: Array<string>;
  rowsPerPart: number;
  fileName: string;
}

export class JSONPartialTableModel extends TableModel {
  private columnNames = Array<string>();
  private columns = Array<Column>();
  private header: HeaderFileJSON;
  private headerPath = '';

  constructor(headerFile: string) {
    super();

    let splitPos = headerFile.lastIndexOf('/');
    if (splitPos != -1)
      this.headerPath = headerFile.substr(0, splitPos + 1);
    
    d3.json(headerFile, (err, data) => {
      let header = this.header = data as HeaderFileJSON;
      this.rowsPerBuffer = header.rowsPerPart;
      this.columns = header.columns.map((label, id) => ({ id, label}));
      this.setDimension(header.columns.length, header.rows);
      console.log(this.getFilePartUrl(0));
    });
  }

  protected updateColumns(range: Array<number>) {
    this.setColumns(this.columns.slice(range[0], range[1] + 1));
  }

  getFilePartUrl(n: number) {
    return this.headerPath + this.header.fileName.replace('%d', '' + n);
  }

  getPartsFromRows(rows: Array<number>): Array<number> {
    let rowsPerBuffer = this.rowsPerBuffer;
    let rowNum = rows[1] - rows[0] + 1;
    let partsRange = [
      Math.floor(rows[0] / rowsPerBuffer),
      Math.floor((rows[0] + rowNum / 2) / rowsPerBuffer)
    ];
    return partsRange;
  }

  private buffs = Array<{partIdx: number, cells: Cells}>();
  protected updateCells(columns: Array<number>, rows: Array<number>) {
    let parts = this.getPartsFromRows(rows);
    console.log(parts, rows);
    if (parts[1] - parts[0] == 0) {
      d3.json(this.getFilePartUrl(parts[0]), (err, data) => {
        const names = this.columnNames;
        let cells = Array<Array<Cell>>(columns[1] - columns[0] + 1);
        for (let c = 0; c < cells.length; c++) {
          let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
          for (let r = 0; r < rowArr.length; r++) {
            try {
              rowArr[r] = {
                value: '' + data[r + rows[0]][c + columns[0]]
              };
            } catch (e) {
              console.log(e);
            }
          }
        }
        this.setCells(cells);
      });
    }
    /*const data = this.json;
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
    this.setCells(cells);*/
  }
}