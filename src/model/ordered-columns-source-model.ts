import {TableSourceModel, DataRange, Cell, ColumnType, SortColumn} from 'model/table-source-model';
import {CompoundCondition, ColumnCondition} from 'model/filter-condition';
import {assign} from 'lodash';

type Mapper = (row: number, data: Cell) => Cell;
type ColumnsMapper = {[columnId: string]: Mapper}; 

interface Column {
  id?: string;
  type?: ColumnType;
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
    newOrder && newOrder.forEach(column => {
      if (column.id == null) {
        column.id = sourceModel.getColumn(column.colIdx).id
      }

      if (column.id == '' || column.id == null)
        return;

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

  getOrigCol(colId: string): string {
    if (!this.columnsOrder)
      return this.sourceModel.getColumn(this.sourceModel.getColumnIdx(colId)).id;
    
    for(let n = 0; n < this.columnsOrder.length; n++) {
      if (this.columnsOrder[n].id == colId)
        return this.sourceModel.getColumn(this.columnsOrder[n].colIdx).id;
    }

    throw 'column not found';
  }

  getNewCol(colId: string): string {
    if (!this.columnsOrder)
      return colId;
    
    for(let n = 0; n < this.columnsOrder.length; n++) {
      if (this.sourceModel.getColumn(this.columnsOrder[n].colIdx).id == colId)
        return this.columnsOrder[n].id;
    }

    throw 'column not found';
  }

  getColumnIdx(colId: string) {
    if (!this.columnsOrder)
      return this.sourceModel.getColumnIdx(colId);
    
    for(let n = 0; n < this.columnsOrder.length; n++) {
      if (this.columnsOrder[n].id == colId)
        return n;
    }

    return -1;
  }

  getColumn(colIdx: number) {
    if (!this.columnsOrder)
      return this.sourceModel.getColumn(colIdx);

    if (this.columnsOrder && colIdx >= this.columnsOrder.length)
      throw 'column index out of range';

    let column = this.columnsOrder[colIdx];
    let origColumn = this.sourceModel.getColumn(column.colIdx);
    return {
      id: column.id || origColumn.id,
      type: column.type || origColumn.type
    };
  }

  protected remapColumns(conditions: CompoundCondition | ColumnCondition) {
    if (!this.columnsOrder || !this.columnsOrder.length)
      return conditions;

    conditions = assign({}, conditions);
    let compCond = conditions as CompoundCondition;
    if (compCond.op != null) {
      compCond.condition = compCond.condition.map(cond => this.remapColumns(cond));
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

  getUniqueValues(col: number): TableSourceModel {
    if (!this.columnsOrder)
      return this.sourceModel.getUniqueValues(col);

    if (col >= this.columnsOrder.length)
      throw 'column index out of range';
    
    col = this.columnsOrder[col].colIdx;
    return this.sourceModel.getUniqueValues(col);
  }

  setSorting(columns: Array<SortColumn>) {
    if (this.columnsOrder) {
      columns = columns.map(item => {
        return {column: this.getOrigCol(item.column), dir: item.dir};
      });
    }
    this.sourceModel.setSorting(columns);
  }

  getSorting(): Array<SortColumn> {
    let cols = this.sourceModel.getSorting();
    if (!this.columnsOrder)
      return cols;
    return cols.map(col => {
      return {column: this.getNewCol(col.column), dir: col.dir};
    });
  }
}