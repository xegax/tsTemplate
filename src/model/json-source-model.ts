import {
  CacheVisitor,
  Cell,
  Cells,
  CacheItem,
  TableSourceModel,
  TableSourceModelImpl,
  DimensionEnum,
  Column
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
    this.columns.itemsPerBuffer = columns.length;
    this.fillCacheCol(0, (relCol, absCol) => {
      return {id: this.columnNames[absCol]};
    });
  }

  protected updateCache(visit: CacheVisitor) {
    visit((cacheCol, cacheRow, cache, colsCache: Array<Column>) => {
      if (cache.cells == null)
        this.fillCache(cacheCol, cacheRow, cache.cells = [], (relCol, relRow, absCol, absRow) => {
          return this.json[absRow][this.columnNames[absCol]]
        });
    });
    return null;
  }
}