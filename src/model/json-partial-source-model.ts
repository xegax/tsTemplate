import {
  Cell,
  Cells,
  CacheItem,
  TableSourceModel,
  TableSourceModelImpl,
  DimensionEnum,
  CacheVisitor
} from 'model/table-source-model';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {parsePath} from 'common/common';
import {Publisher} from 'common/publisher';

interface HeaderFileJSON {
  rows: number;
  columns: Array<string>;
  rowsPerPart: number;
  fileName: string;
}

export class JSONPartialSourceModel extends TableSourceModelImpl {
  private header: HeaderFileJSON;
  private headerPath = '';
  private requestor: Requestor;

  constructor(headerFile: string, prevModel?: TableSourceModel, requestor?: Requestor) {
    super(prevModel);
    this.requestor = requestor || getGlobalRequestor();
    this.headerPath = parsePath(headerFile).path;

    this.requestor.getJSON(headerFile).then((data) => {
      let header = this.header = data as HeaderFileJSON;
      this.rows.itemsPerBuffer = header.rowsPerPart;
      this.columns.itemsPerBuffer = header.columns.length;
      this.setTotal(header.columns.length, header.rows);
    });
  }

  private getFilePartUrl(n: number): string {
    return this.headerPath + this.header.fileName.replace('%d', '' + n);
  }

  protected updateCacheImpl(visit: CacheVisitor, callback: () => void) {
    visit((col, row) => {
      let item = this.createOrGetCacheItem(col, row);
      if (item.cells != null) {
        return;
      }

      item.cells = [];
      this.requestor.getJSON(this.getFilePartUrl(row), {}).then(data => {
        this.fillCache(col, row, item.cells, (c, r) => data[r][c]);
        callback && callback();
      }).catch(err => {
          console.log('error', err);
      });
    });
  }

  protected updateCache(visit: CacheVisitor) {
    return new Promise(resolve => {
      this.updateCacheImpl(visit, () => resolve(null));
    });
  }
}
