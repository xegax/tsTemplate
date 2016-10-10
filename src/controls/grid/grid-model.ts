import {Publisher} from 'common/publisher';

export enum GridModelEvent {
  ROWS          = 1 << 0,
  COLUMNS       = 1 << 1,
  CELL_HEIGHT   = 1 << 2,
  WIDTH         = 1 << 3,
  HEIGHT        = 1 << 4,
  SCROLL_LEFT   = 1 << 5,
  SCROLL_TOP    = 1 << 6,
  START_COLUMN  = 1 << 7,
  COLUMNS_RENDER_RANGE = 1 << 8,
  ROWS_RENDER_RANGE    = 1 << 9,
  ROWS_ALIGNED  = 1 << 10
}

export interface GridModel extends Publisher {
  setRowsAligned(value: boolean);
  isRowsAligned(): boolean;

  setRows(rows: number);
  getRows(): number;

  setColumns(columns: Array<number>);
  getColumns(): Array<number>;
  getColumnsSizes(): Array<number>;

  setCellHeight(cellHeight: number);
  getCellHeight(): number;

  setWidth(width: number);
  getWidth(): number;

  setHeight(height: number);
  getHeight(): number;

  setScrollLeft(scrollLeft: number);
  getScrollLeft(): number;

  setScrollTop(scrollTop: number);
  getScrollTop(): number;

  getAxisRangeColumns(): {idx: number, offs: number, num: number};
  getAxisRangeRows(): {idx: number, offs: number, num: number};

  getColumnSize(column: number): number;
  setColumnSize(column: number, size: number);
  getColumnsNum(): number;

  getSummOfSizes(): number;

  getStartColumnOffs(): number;
}

export class GridModelBase extends Publisher implements GridModel {
  private cellHeight: number = 30;
  private columns = Array<number>();
  private columnsProps = Array<number>();
  private columnsSizeSumm: number = 0;

  private rows: number = 0;
  private width: number = 0;
  private height: number = 0;
  private scrollLeft: number = 0;
  private scrollTop: number = 0;

  private startColumn: number = 0;
  private startColumnOffs: number = 0;

  private columnsRenderRange = [0, 0];
  private rowsRenderRange = [0, 0];

  private rowsAligned: boolean = true;

  setRows(rows: number): GridModel {
    if (rows == this.rows)
      return;

    this.rows = rows;
    this.updateRowsRange();
    this.updateVersion(GridModelEvent.ROWS, 1);
  }

  getRows() {
    return this.rows;
  }

  setRowsAligned(value: boolean) {
    if (this.rowsAligned == value)
      return;

    this.rowsAligned = value;
    this.updateVersion(GridModelEvent.ROWS_ALIGNED, 1);
  }

  isRowsAligned() {
    return this.rowsAligned;
  }

  setColumns(columns: Array<number>) {
    this.columnsProps = columns.slice();
    this.resizeColumns();

    this.updateColumnsRange();
    this.updateStartColumn();
    this.updateVersion(GridModelEvent.COLUMNS, 1);
  }

  getColumnsSizes(): Array<number> {
    return this.columns.slice();
  }

  getColumns(): Array<number> {
    return this.columnsProps.slice();
  }

  getSummOfSizes(): number {
    return this.columnsSizeSumm;
  }

  setCellHeight(cellHeight: number) {
    if (cellHeight == this.cellHeight)
      return;
    this.cellHeight = cellHeight;

    this.updateRowsRange();
    this.updateVersion(GridModelEvent.CELL_HEIGHT, 1);
  }

  getCellHeight() {
    return this.cellHeight;
  }

  setWidth(width: number) {
    if (width == this.width)
      return;

    this.width = width;
    this.resizeColumns();
    this.updateColumnsRange();
    this.updateRowsRange();
    this.updateVersion(GridModelEvent.WIDTH, 1);
  }

  getWidth() {
    return this.width;
  }

  setHeight(height: number) {
    if (height == this.height)
      return;

    this.height = height;
    this.updateColumnsRange();
    this.updateRowsRange();
    this.updateVersion(GridModelEvent.HEIGHT, 1);
  }

  getHeight() {
    return this.height;
  }

  setScrollLeft(scrollLeft: number) {
    if (this.scrollLeft == scrollLeft)
      return;

    this.scrollLeft = scrollLeft;
    this.updateColumnsRange();
    this.updateStartColumn();

    this.updateVersion(GridModelEvent.SCROLL_LEFT, 1);
  }

  getScrollLeft() {
    return this.scrollLeft;
  }

  setScrollTop(scrollTop: number) {
    if (this.scrollTop == scrollTop)
      return;
    this.scrollTop = scrollTop;
    this.updateRowsRange();
    this.updateVersion(GridModelEvent.SCROLL_TOP, 1);
  }

  getScrollTop() {
    return this.scrollTop;
  }

  protected getAxisRange(size: number, cellSize: number, scroll: number, cells: number) {
    let idx = Math.floor(scroll / cellSize);
    let offs = scroll % cellSize || 0;
    let num = Math.ceil(size / cellSize);
    if (offs > 0)
      num++;
    
    num = Math.min(idx + num, cells) - idx;
    return {idx, offs: -offs, num};
  }

  getAxisRangeColumns() {
    let {startColumn, startColumnOffs} = this;
    let pos = -startColumnOffs;
    for (var num = startColumn; num < this.columns.length; num++) {
      if (pos > this.width)
        break;
      pos += this.getColumnSize(num);
    }

    return {
      idx: startColumn,
      offs: startColumnOffs,
      num: num - startColumn
    };
  }

  getColumnsRange(): Array<number> {
    return this.columnsRenderRange.slice();
  }

  getRowsRange(): Array<number> {
    return this.rowsRenderRange.slice();
  }

  getAxisRangeRows() {
    let scrollTop = this.scrollTop;
    if (this.rowsAligned) {
      scrollTop = Math.floor(scrollTop / this.cellHeight) * this.cellHeight;
    }

    return this.getAxisRange(this.height, this.cellHeight, scrollTop, this.rows);
  }

  getColumnSize(column: number) {
    return this.columns[column];
  }

  setColumnSize(column: number, size: number) {
    if (this.columnsProps[column] == size)
      return;
    this.columnsProps[column] = size;
    this.resizeColumns();
    this.updateColumnsRange();
    this.updateVersion(GridModelEvent.COLUMNS);
  }

  getColumnsNum() {
    return this.columns.length;
  }

  getStartColumnOffs() {
    return this.startColumnOffs;
  }

  private resizeColumns() {
    let fixedSize = 0;
    let props = 0;
    let scale = 1;
    for (let n = 0; n < this.columnsProps.length; n++) {
      if (this.columnsProps[n] > 1) {
        fixedSize += this.columnsProps[n];
      } else {
        props += this.columnsProps[n];
      }
    }

    if (props != 1)
      scale = 1 / props;
    
    this.columns = this.columnsProps.slice();
    for (let n = 0; n < this.columns.length; n++) {
      if (this.columnsProps[n] > 1) {
        this.columns[n] = this.columnsProps[n];
      } else {
        this.columns[n] = this.columnsProps[n] * (this.width - fixedSize) * scale;
      }
    }
    
    let s = 0;
    for (let n = 0; n < this.columns.length; n++)
      s += this.columns[n];

    this.columnsSizeSumm = s;
  }

  private updateStartColumn() {
    let startColumn = 0;
    let startColumnOffs = 0;
    let pos = 0;
    for(let col = 0; col < this.columns.length; col++) {
      if (pos > this.scrollLeft) {
        startColumn = Math.max(col - 1, 0);
        startColumnOffs = this.scrollLeft - (pos - this.columns[startColumn]);
        break;
      }
      pos += this.columns[col];
    }

    if (startColumn != this.startColumn || startColumnOffs != this.startColumnOffs) {
      this.startColumn = startColumn;
      this.startColumnOffs = startColumnOffs;
      this.updateVersion(GridModelEvent.START_COLUMN, 1);
    }
  }

  private updateColumnsRange() {
    let cols = this.getAxisRangeColumns();
    let arr = [cols.idx, Math.min(cols.idx + cols.num - 1, this.columns.length - 1)];
    if (this.columnsRenderRange[0] == arr[0] && this.columnsRenderRange[1] == arr[1])
      return;
    this.columnsRenderRange[0] = arr[0];
    this.columnsRenderRange[1] = arr[1];
    this.updateVersion(GridModelEvent.COLUMNS_RENDER_RANGE, 1);
  }

  private updateRowsRange() {
    let rows = this.getAxisRangeRows();
    let arr = [rows.idx, Math.min(rows.idx + Math.max(0, rows.num - 1), Math.max(this.rows - 1, 0))];
    if (this.rowsRenderRange[0] == arr[0] && this.rowsRenderRange[1] == arr[1])
      return;
    this.rowsRenderRange[0] = arr[0];
    this.rowsRenderRange[1] = arr[1];
    this.updateVersion(GridModelEvent.ROWS_RENDER_RANGE, 1);
  }
}