import {TableSourceModelImpl, TableSourceModel, CacheVisitor} from 'model/table-source-model';
import {Timer} from 'common/timer';

export class TestTableSourceModel extends TableSourceModelImpl {
  protected delay: number;

  constructor(cols: number, rows: number, delay: number = 0, prevModel: TableSourceModel) {
    super(prevModel);
    this.delay = delay;
    this.setTotal(cols, rows);
  }

  protected updateCacheImpl(visit: CacheVisitor) {
    visit((col, row, cache) => {
      if (cache.cells)
        return;

      this.fillCache(col, row, cache.cells = [], (c, r, absCol, absRow) => {
        return absRow + 'x' + absCol;
      });
    });
  }

  protected updateCache(visit: CacheVisitor) {
    if (this.delay != 0) {
      return new Promise(resolve => {
        new Timer(() => {
          this.updateCacheImpl(visit);
          resolve(null);
        }).run(this.delay);
      });
    }

    this.updateCacheImpl(visit);
    return null;
  }
}
