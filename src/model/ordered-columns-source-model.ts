import {TableSourceModel, DataRange, Cell} from 'model/table-source-model';

type Mapper = (row: number, data: Cell) => Cell;
type ColumnsMapper = {[columnId: string]: Mapper}; 

interface Column {
  id?: string;
  colIdx: number;
  mapper?: Mapper;
}

export class OrderedColumnsSourceModel implements TableSourceModel {
  private sourceModel: TableSourceModel;
  private columnsOrder: Array<Column>;
  private columnsMapper: ColumnsMapper; // index = [0; columnsOrder.length)

  constructor(sourceModel: TableSourceModel, newOrder?: Array<Column>, mapper?: ColumnsMapper) {
    this.sourceModel = sourceModel;
    
    this.columnsOrder = newOrder;
    newOrder.forEach(column => {
      if (!column.mapper)
        return;
      let mappers = this.columnsMapper || (this.columnsMapper = {});
      mappers[column.id] = column.mapper;
    });

    if (mapper) {
      Object.keys(mapper).forEach(key => {
        let mappers = this.columnsMapper || (this.columnsMapper = {});
        mappers[key] = mapper[key];
      });
    }
  }

  removeColumn(column: number) {
    if (!this.columnsOrder)
      return;

    this.columnsOrder.splice(column, 1);
  }

  loadData(range: DataRange) {
    if (this.columnsOrder && this.columnsOrder.length) {
      let cols = this.columnsOrder.slice(range.cols[0], range.cols[1] + 1)
        .map(a => a.colIdx)
        .filter(a => a >= 0)
        .sort((a, b) => a - b);

      range.cols[0] = cols[0];
      range.cols[1] = cols[cols.length - 1];
    }
    return this.sourceModel.loadData(range);
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
    let origCol = col;
    let columnId: string;

    let column = this.columnsOrder && this.columnsOrder[col];
    if (column) {
      origCol = column.colIdx;
      columnId = column.id;
    }

    if (!columnId)
      columnId = this.getColumn(origCol).id;

    let cell = this.sourceModel.getCell(origCol, row);
    let mapper = this.columnsMapper && this.columnsMapper[columnId];
    if (!mapper)
      return cell;
    
    return mapper(row, cell);
  }

  addSubscriber(callback: (mask: number) => void) {
    return this.sourceModel.addSubscriber(callback);
  }

  removeSubscriber(callback: (mask: number) => void) {
    return this.sourceModel.removeSubscriber(callback);
  }

  getColumn(colIdx: number) {
    if (!this.columnsOrder)
      return this.sourceModel.getColumn(colIdx);

    if (this.columnsOrder && colIdx >= this.columnsOrder.length)
      throw 'column index out of range';

    let column = this.columnsOrder[colIdx];
    let origColumn = this.sourceModel.getColumn(column.colIdx);
    return {
      id: column.id || origColumn.id
    };
  }
}