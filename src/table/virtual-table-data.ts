import {CachedTableData} from 'table/cached-table-data';

export class VirtualTableData extends CachedTableData {
  private getCellImpl = (row, col) => {
    return row + ':' + col;
  };

  constructor(rows: number, cols: number, getCell?: (row: number, col: number) => any) {
    super(rows, Math.max(1, cols));
    this.getCellImpl = getCell || this.getCellImpl;
    if (cols > 0)
      this.columns = new VirtualTableData(cols, 0);
  }
}
