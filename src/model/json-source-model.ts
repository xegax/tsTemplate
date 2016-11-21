import {
  CacheVisitor,
  Cell,
  Cells,
  CacheItem,
  TableSourceModelImpl,
  DimensionEnum
} from 'model/table-source-model';

export class JSONSourceModel extends TableSourceModelImpl {
  private json: Array<Object>;
  private columnNames = Array<string>();

  constructor(json: Array<Object>) {
    super();
    this.json = json;

    let columns = this.columnNames = Object.keys(json[0]);
    this.setTotal(columns.length, json.length);
  }

  protected fillCells(col: number, row: number, cells: Cells, data: Array<any>) {
    let rows = this.getCellsRange(DimensionEnum.Row, [row, row]);
    let cols = this.getCellsRange(DimensionEnum.Column, [col, col]);

    let columns = this.columnNames;
    for (let c = 0; c < columns.length; c++) {
      let rowArr = cells[c] = Array<Cell>(rows[1] - rows[0] + 1);
      for (let r = 0; r < rowArr.length; r++) {
        try {
          rowArr[r] = {
            value: data[r][columns[c]]
          };
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  protected updateCache(visit: CacheVisitor) {
    visit((col, row) => {
      let item = this.createOrGetCacheItem(col, row);
      if (item.cells != null)
        return;
      this.fillCells(col, row, item.cells = [], this.json);
    });
    return null;
  }
}