import {Publisher} from 'common/publisher';

export enum GridModelEvent {
  ROWS                  = 1 << 0,
  COLUMNS               = 1 << 1,
  CELL_HEIGHT           = 1 << 2,
  WIDTH                 = 1 << 3,
  HEIGHT                = 1 << 4,
  SCROLL_LEFT           = 1 << 5,
  SCROLL_TOP            = 1 << 6,
  START_COLUMN          = 1 << 7,
  COLUMNS_RENDER_RANGE  = 1 << 8,
  ROWS_RENDER_RANGE     = 1 << 9,
  ROW_SELECT            = 1 << 10,
  ROW_HIGHLIGHT         = 1 << 11,
  FEATURES              = 1 << 12,
  COLUMN_RESIZING       = 1 << 13,
  COLUMN_RESIZED        = 1 << 14,
  COLUMN_SELECT         = 1 << 15
}

export enum GridModelFeatures {
  ROWS_ALIGNED        = 1 << 0,
  ROWS_SELECTABLE     = 1 << 1,
  CELLS_SELECTABLE    = 1 << 2,
  ROWS_HIGHLIGHTABLE  = 1 << 3,
  ROWS_MULTI_SELECT   = 1 << 4
}

export class GridModel extends Publisher {
  private cellHeight: number = 30;
  
  private columnSize = Array<number>();     // calculated column size
  private columnProp = Array<number>();     // [0;1] = column proportion, > 1 = column size
  private columnToResize: number;

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

  private featuresMask: number = GridModelFeatures.ROWS_ALIGNED |
                                 GridModelFeatures.ROWS_HIGHLIGHTABLE |
                                 GridModelFeatures.ROWS_SELECTABLE;

  private highlightRow: number = -1;
  private selectRow = Array<number>();
  private selectColumn: number = 0;

  constructor(prevModel?: GridModel) {
    super();

    if (prevModel) {
      this.featuresMask = prevModel.featuresMask;
    }
  }

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

  setFeatures(featuresMask: number, state: boolean) {
    let newFeatures = (state == true) ? this.featuresMask | featuresMask : this.featuresMask & (~featuresMask);
    if (newFeatures == this.featuresMask)
      return;

    this.updateVersion(GridModelEvent.FEATURES);
  }

  replaceFeatures(featuresMask: number) {
    if (featuresMask == this.featuresMask)
      return;
    
    this.featuresMask = featuresMask;
    this.updateVersion(GridModelEvent.FEATURES);
  }

  hasFeatures(featuresMask: number) {
    return (this.featuresMask & featuresMask) != 0;
  }

  setColumns(columns: Array<number>) {
    this.columnProp = columns.slice();
    this.resizeColumns();

    this.updateStartColumn();
    this.updateColumnsRange();
    this.updateVersion(GridModelEvent.COLUMNS, 1);
  }

  getColumnsSizes(): Array<number> {
    return this.columnSize.slice();
  }

  getColumns(): Array<number> {
    return this.columnProp.slice();
  }

  getResizingColumn() {
    return this.columnToResize;
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
    if (width != null && width == this.width)
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
    if (height != null && height == this.height)
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
    this.updateStartColumn();
    this.updateColumnsRange();

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
    for (var num = startColumn; num < this.columnSize.length; num++) {
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

  getAxisRangeRows(onlyFullVisible?: boolean) {
    let scrollTop = this.scrollTop;
    if (this.hasFeatures(GridModelFeatures.ROWS_ALIGNED)) {
      scrollTop = Math.floor(scrollTop / this.cellHeight) * this.cellHeight;
    }

    let res = this.getAxisRange(this.height, this.cellHeight, scrollTop, this.rows);
    if (onlyFullVisible === true) {
      let {cellHeight, height} = this;
      if (res.offs != 0) {
          height -= cellHeight + res.offs;
          res.idx++;
      }
      res.num = Math.floor(height / cellHeight) - 1;
    }
    return res;
  }

  getColumnSize(column: number) {
    return this.columnSize[column];
  }

  startColumnResizing(column: number) {
    if (this.columnToResize == column)
      return;
    this.columnToResize = column;
    this.updateVersion(GridModelEvent.COLUMN_RESIZING, 1);
  }

  endColumnResizing() {
    if (this.columnToResize == -1)
      return;
    this.updateVersion(GridModelEvent.COLUMN_RESIZED, 0);
    this.columnToResize = -1;
  }


  setColumnSize(column: number, size: number) {
    if (this.columnProp[column] == size)
      return;

    this.columnProp[column] = size;
    this.resizeColumns();
    this.updateColumnsRange();
    this.updateVersion(GridModelEvent.COLUMNS | GridModelEvent.COLUMN_RESIZING);
  }

  getSizeToProp(size: number) {
    let fixedSize = 0;
    let props = 0;
    let scale = 1;
    for (let n = 0; n < this.columnProp.length; n++) {
      if (this.columnProp[n] > 1) {
        fixedSize += this.columnProp[n];
      } else {
        props += this.columnProp[n];
      }
    }

    if (props != 1)
      scale = 1 / props;

    return size / (this.width - (fixedSize - size));
  }

  getColumnsNum() {
    return this.columnSize.length;
  }

  getStartColumnOffs() {
    return this.startColumnOffs;
  }

  setScrollTopRow(row: number) {
    row = Math.max(0, row);
    row = Math.min(this.rows - 1, row);
    this.setScrollTop(row * this.cellHeight);
  }

  scrollToRow(row: number) {
    row = Math.max(0, row);
    row = Math.min(this.rows - 1, row);

    const rows = this.getAxisRangeRows(true);
    const range = [rows.idx, rows.idx + rows.num - 1];

    if (row < range[0])
      this.setScrollTop(row * this.cellHeight);
    if (row > range[1])
      this.setScrollTop((row - rows.num) * this.cellHeight);
  }

  scrollToColumn(column: number) {
    column = Math.max(0, column);
    column = Math.min(this.columnSize.length - 1, column);

    const cols = this.getAxisRangeColumns();
    const range = [cols.idx, cols.idx + cols.num - 1];
    
    if (this.getColumnPos(range[0]) < this.scrollLeft)
      range[0]++;

    if (column < range[0])
      return this.setScrollLeft(this.getColumnPos(column));

    if (this.getColumnPos(range[1]) + this.columnSize[range[1]] - this.scrollLeft > this.width)
      range[1]--;
    if (column > range[1]) {
      this.setScrollLeft(this.getColumnPos(column) + this.columnSize[column] - this.width);
    }
  }

  setSelectRowSilent(row: number, force: boolean = false) {
    if (!this.hasFeatures(GridModelFeatures.CELLS_SELECTABLE | GridModelFeatures.ROWS_SELECTABLE))
      return false;

    row = Math.max(0, row);
    row = Math.min(this.rows - 1, row);

    if (this.selectRow.indexOf(row) == -1) {
      this.selectRow.push(row);
    } else if (!force) {
      return false;
    }

    this.scrollToRow(row);
    return true;
  }

  setRowSelect(row: number, force: boolean = false) {
    if (this.setSelectRowSilent(row, force))
      this.updateVersion(GridModelEvent.ROW_SELECT, 1);
  }

  clearRowSelect() {
    if (this.selectRow.length == 0)
      return;
    this.selectRow = [];
    this.updateVersion(GridModelEvent.ROW_SELECT, 1);
  }

  setSelectColumn(column: number, force: boolean = false) {
    column = Math.max(0, column);
    column = Math.min(this.columnSize.length - 1, column);

    if (force == false && this.selectColumn == column)
      return false;
    
    this.selectColumn = column;
    this.scrollToColumn(column);
    this.updateVersion(GridModelEvent.COLUMN_SELECT, 1);
    return true;
  }

  setHighlightRow(row: number, scrollToRow: boolean = false) {
    if (!this.hasFeatures(GridModelFeatures.ROWS_HIGHLIGHTABLE))
      return;

    row = Math.max(-1, row);
    row = Math.min(this.rows - 1, row);

    if (this.highlightRow == row)
      return;

    this.highlightRow = row;
    
    if (scrollToRow && row >= 0)
      this.scrollToRow(row);

    this.updateVersion(GridModelEvent.ROW_HIGHLIGHT, 1);
  }

  getHighlightRow() {
    return this.highlightRow;
  }

  getSelectRow(): number {
    if (this.selectRow.length == 0)
      return -1;
    return this.selectRow[this.selectRow.length - 1];
  }

  isRowSelect(row: number): boolean {
    return this.hasFeatures(GridModelFeatures.ROWS_SELECTABLE | GridModelFeatures.CELLS_SELECTABLE) && this.selectRow.indexOf(row) != -1;
  }

  isCellSelect(column: number, row: number): boolean {
    return this.selectColumn == column && this.selectRow.indexOf(row) != -1;
  }

  getSelectColumn(): number {
    return this.selectColumn;
  }

  private resizeColumns() {
    let fixedSize = 0;
    let props = 0;
    let scale = 1;
    for (let n = 0; n < this.columnProp.length; n++) {
      if (this.columnProp[n] > 1) {
        fixedSize += this.columnProp[n];
      } else {
        props += this.columnProp[n];
      }
    }

    if (props != 1)
      scale = 1 / props;

    this.columnSize = this.columnProp.slice();
    for (let n = 0; n < this.columnSize.length; n++) {
      if (this.columnProp[n] > 1) {
        this.columnSize[n] = this.columnProp[n];
      } else {
        this.columnSize[n] = this.columnProp[n] * (this.width - fixedSize) * scale;
      }
    }

    let s = 0;
    for (let n = 0; n < this.columnSize.length; n++)
      s += this.columnSize[n];

    this.columnsSizeSumm = s;
  }

  private getColumnPos(column: number) {
    let pos = 0;
    for (let col = 0; col < column; col++) {
      pos += this.columnSize[col];
    }
    return pos;
  }

  private updateStartColumn() {
    let startColumn = 0;
    let startColumnOffs = 0;
    let pos = 0;
    for (let col = 0; col < this.columnSize.length; col++) {
      if (pos > this.scrollLeft) {
        startColumn = Math.max(col - 1, 0);
        startColumnOffs = this.scrollLeft - (pos - this.columnSize[startColumn]);
        break;
      }
      pos += this.columnSize[col];
    }

    if (startColumn != this.startColumn || startColumnOffs != this.startColumnOffs) {
      this.startColumn = startColumn;
      this.startColumnOffs = startColumnOffs;
      this.updateVersion(GridModelEvent.START_COLUMN, 1);
    }
  }

  private updateColumnsRange() {
    let cols = this.getAxisRangeColumns();
    let arr = [cols.idx, Math.min(cols.idx + cols.num - 1, this.columnSize.length - 1)];
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
