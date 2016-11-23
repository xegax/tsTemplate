import {TableSourceModel, DataRange} from 'model/table-source-model';

export class OrderedColumnsSourceModel implements TableSourceModel {
  private sourceModel: TableSourceModel;
  private columnsOrder: Array<number>;

  constructor(sourceModel: TableSourceModel, colums?: Array<number>) {
    this.sourceModel = sourceModel;
    this.columnsOrder = colums;
  }

  removeColumn(column: number) {
    if (!this.columnsOrder)
      return;

    this.columnsOrder.splice(column, 1);
  }

  loadData(range: DataRange) {
    if (this.columnsOrder && this.columnsOrder.length) {
      let cols = this.columnsOrder.slice(range.cols[0], range.cols[1] + 1).sort((a, b) => a - b);
      range.cols[0] = cols[0];
      range.cols[1] = cols[cols.length - 1];
    }
    this.sourceModel.loadData(range);
  }

  reload() {
    this.sourceModel.reload();
  }

  getTotal() {
    let total = this.sourceModel.getTotal();
    if (this.columnsOrder && this.columnsOrder.length)
      total.columns = this.columnsOrder.length;

    return total;
  }

  getColumnsRange() {
    return this.sourceModel.getColumnsRange();
  }
  
  getRowsRange(): Array<number> {
    return this.sourceModel.getRowsRange();
  }

  getCell(col: number, row: number) {
    col = this.translateColumn(col);
    return this.sourceModel.getCell(col, row);
  }

  addSubscriber(callback: (mask: number) => void) {
    return this.sourceModel.addSubscriber(callback);
  }

  removeSubscriber(callback: (mask: number) => void) {
    return this.removeSubscriber(callback);
  }

  protected translateColumn(colIdx: number): number {
    if (!this.columnsOrder || colIdx >= this.columnsOrder.length)
      return colIdx;

    return this.columnsOrder[colIdx];
  }
}