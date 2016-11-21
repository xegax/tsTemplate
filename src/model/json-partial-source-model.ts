import {Cell, Cells, CacheItem, TableSourceModelImpl, DimensionEnum, CacheVisitor} from 'model/table-source-model';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {parsePath} from 'common/common';

interface HeaderFileJSON {
  rows: number;
  columns: Array<string>;
  rowsPerPart: number;
  fileName: string;
}

export class JSONPartialSourceModel extends TableSourceModelImpl {
  private header: HeaderFileJSON;
  private headerPath = '';
  private buffs = Array<{cells: Cells}>();
  private requestor: Requestor;

  constructor(headerFile: string, requestor?: Requestor) {
    super();
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

  protected fillCells(col: number, row: number, cells: Cells, data: Array<any>) {
    let rows = this.getCellsRange(DimensionEnum.Row, [row, row]);
    let cols = this.getCellsRange(DimensionEnum.Column, [col, col]);

    let columns = this.header.columns;
    for (let c = 0; c < columns.length; c++) {
      let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          rowArr[r] = {
            value: data[r][c]
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  protected updateCacheImpl(visit: CacheVisitor, callback: () => void) {
    visit((col, row) => {
      let item = this.createOrGetCacheItem(col, row);
      if (item.cells != null) {
        return;
      }

      item.cells = [];
      this.requestor.getJSON(this.getFilePartUrl(row), {}).then(data => {
        this.fillCells(col, row, item.cells, data);
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
