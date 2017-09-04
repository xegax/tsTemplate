import {
  CachedTableData,
  TableData,
  TableCell,
  Block,
  TableRange,
  fillCache
} from 'table/cached-table-data';

export {TableData, TableCell};

export class VirtualTableData extends CachedTableData {
  private getCellImpl = (row, col) => {
    const text = row + ':' + col;
    return {text, raw: text};
  };

  private prepareCells = (rows: Array<number>, cols: Array<number>) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({}), 1);
    });
  }

  constructor(
    rows: number, cols: number,
    getCell?: (row: number, col: number) => TableCell,
    prepareCells?: (rows: Array<number>, cols: Array<number>) => Promise<any>,
    rowsPerBlock?: number
  ) {
    super(rows, Math.max(1, cols), rowsPerBlock);
    this.getCellImpl = getCell || this.getCellImpl;
    this.prepareCells = prepareCells || this.prepareCells;

    if (cols > 0)
      this.columns = new VirtualTableData(cols, 0);
  }

  protected loadCacheRange(block: Block, range: TableRange): Promise<any> {
    return this.prepareCells(range.rows, range.cols).then(() => {
      fillCache(block, range, (row, col) => {
        return this.getCellImpl(row, col);
      });
    });
  }

  static create(params: {
                          rows: number;
                          cols: number;
                          maxCache: number;
                          getCell?: (row: number, col: number) => TableCell
                        }): Promise<VirtualTableData> {
    const table = new VirtualTableData(params.rows, params.cols, params.getCell);
    return table.selectData([0, params.maxCache || 1000]).then(() => table);
  }
}
