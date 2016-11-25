import {TableSourceModel, DataRange, Cell} from 'model/table-source-model';

type ColumnsMapper = {[column: number]: (row: number, data: Cell) => Cell}; 

export class OrderedColumnsSourceModel implements TableSourceModel {
  private sourceModel: TableSourceModel;
  private columnsOrder: Array<number>;
  private columnsMapper: ColumnsMapper; // index = [0; columnsOrder.length)

  constructor(sourceModel: TableSourceModel, newOrder?: Array<number>, mapper?: ColumnsMapper) {
    this.sourceModel = sourceModel;
    
    this.columnsOrder = newOrder;
    this.columnsMapper = mapper;
  }

  removeColumn(column: number) {
    if (!this.columnsOrder)
      return;

    this.columnsOrder.splice(column, 1);
  }

  loadData(range: DataRange) {
    if (this.columnsOrder && this.columnsOrder.length) {
      let cols = this.columnsOrder.slice(range.cols[0], range.cols[1] + 1)
        .filter(a => a >= 0)
        .sort((a, b) => a - b);
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
    let origCol = this.translateColumn(col);
    return this.mapCell(col, row, origCol >= 0 ? this.sourceModel.getCell(origCol, row) : {value: '?'});
  }

  addSubscriber(callback: (mask: number) => void) {
    return this.sourceModel.addSubscriber(callback);
  }

  removeSubscriber(callback: (mask: number) => void) {
    return this.sourceModel.removeSubscriber(callback);
  }

  protected mapCell(col: number, row: number, data: Cell): Cell {
    if (!this.columnsMapper)
      return data;

    const getData = this.columnsMapper[col];
    if (!getData)
        return data;

    return getData(row, data);
  }

  protected translateColumn(colIdx: number): number {
    if (!this.columnsOrder || colIdx >= this.columnsOrder.length)
      return colIdx;

    return this.columnsOrder[colIdx];
  }
}