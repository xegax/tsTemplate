import {
  CacheVisitor,
  Cell,
  Cells,
  CacheItem,
  TableSourceModel,
  TableSourceModelImpl,
  DimensionEnum
} from 'model/table-source-model';
import {Publisher} from 'common/publisher';

export class JSONSourceModel extends TableSourceModelImpl {
  private json: Array<Object>;
  private columnNames = Array<string>();

  constructor(json: Array<Object>, prevModel?: TableSourceModel) {
    super(prevModel);
    this.json = json;

    let columns = this.columnNames = Object.keys(json[0]);
    this.setTotal(columns.length, json.length);
  }

  protected updateCache(visit: CacheVisitor) {
    visit((cacheCol, cacheRow, cache) => {
      if (cache.cells != null)
        return;
      this.fillCache(cacheCol, cacheRow, cache.cells = [], (c, r, absCol, absRow) => {
        return this.json[absRow][this.columnNames[c]]
      });
    });
    return null;
  }
}