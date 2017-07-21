import {CachedTableData, Block, fillCache, TableRange} from 'table/cached-table-data';
import {TableData, TableCell, TableInfo, TableParams} from 'table/table-data';
import {assign} from 'lodash';

export class JSONTableData extends CachedTableData {
  private data: Array<Array<string>>;

  constructor(data: Array<Array<string>>, cols: Array<string>) {
    super(data.length, Math.max(1, data.length == 0 ? 1 : data[0].length));
    this.data = data;
    if (cols  != null)
      this.columns = new JSONTableData([cols], null);
  }

  protected loadCacheRange(block: Block, range: TableRange): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        fillCache(block, range, (row, col) => ({text: this.data[row][col], raw: this.data[row][col]}));
        resolve({});
      }, 1);
    });
  }
}

export class JSONTableData2 implements TableData {
  private info: TableInfo;
  private getCellImpl: (row: number, col: number, table: TableData) => TableCell;
  private columns: TableData;
  private parent: TableData;
  private colsArr: Array<string>;
  private params: TableParams = {};

  constructor(rows: number, cols: Array<string>, getCell: (row, col, table) => TableCell, parent: TableData) {
    this.info = {
      rowNum: rows,
      colNum: cols.length
    };
    if (cols != null) {
      this.colsArr = cols.slice();
      this.columns = new JSONTableData([cols], null);
      this.columns.selectData([0, cols.length - 1]);
    }
    this.getCellImpl = getCell;
    this.parent = parent;
  }

  selectData(rows: Array<number>, cols?: Array<number>) {
    return this.parent.selectData(rows, cols);
  }
  
  setParams(params?: TableParams) {
    return this.parent.setParams(params).then(table => {
      return new JSONTableData2(this.info.rowNum, this.colsArr, this.getCellImpl, table);
    });
  }

  createSubtable(params?: TableParams) {
    return this.parent.createSubtable(params).then(table => {
      return new JSONTableData2(this.info.rowNum, this.colsArr, this.getCellImpl, table);
    });
  }
  
  clearCache() {
    return this.parent.clearCache();
  }

  getInfo() {
    return assign({}, this.info);
  }

  getCell(row: number, col: number): TableCell {
    return this.getCellImpl(row, col, this.parent);
  }

  getParent(): TableData {
    return this.parent.getParent();
  }

  getColumns(): TableData {
    return this.columns;
  }

  remove() {
  }
}