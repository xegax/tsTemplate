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
  private rangeColumns = Array<number>(2);
  private rangeRows = Array<number>(2);

  private currColumns = Array<Column>();
  private currCells: Cells;

  private dimension: Dimension = {
    rows: 0,
    columns: 0
  };

  selectColumns(from: number, to: number) {
    const cols = this.rangeColumns;
    if (cols.length == 2 && cols[0] == from && cols[1] == to)
      return;

    cols[0] = from;
    cols[1] = to;
    if (this.rangeRows[1] - this.rangeRows[0] > 0)
      this.updateCells(cols, this.rangeRows);
    this.updateColumns(cols);
  }

  selectRows(from: number, to: number) {
    const rows = this.rangeRows;
    if (rows.length == 2 && rows[0] == from && rows[1] == to)
      return;

    rows[0] = from;
    rows[1] = to;
    this.updateCells(this.rangeColumns, rows);
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
    return this.rangeColumns.slice();
  }

  getRowsRange(): Array<number> {
    return this.rangeRows.slice();
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