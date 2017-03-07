import {CachedTableData, Block, fillCache, TableRange} from 'table/cached-table-data';
import {IThenable} from 'promise';

export class JSONTableData extends CachedTableData {
  private data: Array<Array<string>>;

  constructor(data: Array<Array<string>>, cols: Array<string>) {
    super(data.length, Math.max(1, data.length == 0 ? 1 : data[0].length));
    this.data = data;
    if (cols  != null)
      this.columns = new JSONTableData([cols], null);
  }

  protected loadCacheRange(block: Block, range: TableRange): IThenable<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        fillCache(block, range, (row, col) => ({text: this.data[row][col], raw: this.data[row][col]}));
        resolve({});
      }, 1);
    });
  }
}