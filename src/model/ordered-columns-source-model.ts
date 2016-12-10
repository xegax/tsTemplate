import {TableSourceModel, DataRange, Cell} from 'model/table-source-model';
import {CompoundCondition, ColumnCondition} from 'model/filter-condition';
import {assign} from 'lodash';

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

  getSourceModel() {
    return this.sourceModel;
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

  getCellByColName(colId: string, row: number): Cell {
    return this.sourceModel.getCellByColName(colId, row);
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

  protected remapColumns(conditions: CompoundCondition | ColumnCondition) {
    if (!this.columnsOrder || !this.columnsOrder.length)
      return conditions;

    conditions = assign({}, conditions);
    let compCond = conditions as CompoundCondition;
    if (compCond.op != null) {
      compCond.condition.forEach(cond => this.remapColumns(cond));
    } else {
      let colCond = conditions as ColumnCondition;
      if (colCond.column != null) {
        this.columnsOrder.forEach(column => {
          if (column.id == colCond.column)
            colCond.column = this.sourceModel.getColumn(column.colIdx).id
        });
      }
    }

    return conditions;
  }

  setConditions(conditions: CompoundCondition | ColumnCondition) {
    conditions = this.remapColumns(conditions);
    this.sourceModel.setConditions(conditions);
  }

  getConditions() {
    return this.sourceModel.getConditions();
  }

  getAbilities() {
    return this.sourceModel.getAbilities();
  }
}