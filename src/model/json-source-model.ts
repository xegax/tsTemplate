import {
  CacheVisitor,
  Cell,
  Cells,
  CacheItem,
  TableSourceModel,
  TableSourceModelImpl,
  DimensionEnum,
  Column,
  ColumnType,
  Abilities,
  SortColumn,
  SortDir
} from 'model/table-source-model';
import {Publisher} from 'common/publisher';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {CompoundCondition, ColumnCondition, ConditionText, makeFilterFunction} from 'model/filter-condition';
import {assign} from 'lodash';

export class JSONSourceModel extends TableSourceModelImpl {
  private json: Array<Array<any>>;
  private columnNames = Array<string>();
  private sortIds: Array<number>;
  private rowIds: Array<number>;
  private sorting = Array<SortColumn>();
  private condition: CompoundCondition | ColumnCondition;

  constructor(json: Array<Array<any>>, columns: Array<string>, prevModel?: TableSourceModel) {
    super(prevModel);
    this.initJSON(json, columns);
  }

  private initJSON(json: Array<Array<any>>, columns: Array<string>) {
    this.json = json;
    this.columnNames = columns;
    
    this.setTotal(this.columnNames.length, json.length);
    this.rows.itemsPerBuffer = json.length;
    this.columns.itemsPerBuffer = this.columnNames.length;
    this.updateColsCache();
  }

  static loadJSON(url: string, requestor?: Requestor): JSONSourceModel {
    if (!requestor)
      requestor = getGlobalRequestor();

    let model = new JSONSourceModel([], []);
    requestor.getJSON(url).then(data => {
      model.initJSON(data.slice(1), data[0]);
      model.reload();
    });

    return model;
  }

  private extractColumns(condition: CompoundCondition | ColumnCondition, cols: {[colIdx: number]: string}) {
    let compCond = condition as CompoundCondition;
    if (compCond.condition != null) {
      compCond.condition.forEach(cond => this.extractColumns(cond, cols));
    } else {
      let colCond = condition as ColumnCondition;
      colCond.colIdx = this.getColumnIdx(colCond.column);
      cols[colCond.colIdx] = colCond.column;
    }
  }

  protected updateColsCache() {
    this.columns.itemsPerBuffer = this.columnNames.length;
    this.fillCacheCol(0, (relCol, absCol) => {
      return {id: this.columnNames[absCol], type: ColumnType.text};
    });
  }

  reload() {
    super.reload();
    this.updateColsCache();
  }

  getAbilities() {
    return Abilities.Conditions;
  }

  getValue(row: number, col: number) {
    if (this.sortIds)
      return this.json[this.sortIds[row]][col];
    return this.json[row][col];
  }
  
  setConditions(condition: CompoundCondition | ColumnCondition) {
    this.condition = condition;
    if (condition == null) {
      this.rowIds = null;
      this.setTotal(this.columnNames.length, this.json.length);
    } else {
      this.rowIds = [];
      let colIdxs = [];
      this.extractColumns(condition, colIdxs);

      let comparator = makeFilterFunction(condition);
      for (let r = 0; r < this.json.length; r++) {
        let values = [];
        for (let key in colIdxs) {
          values[+key] =this.getValue(r, +key);
        }

        if (comparator(values)) {
          this.rowIds.push(r);
        }
      }
      
      this.setTotal(this.columnNames.length, this.rowIds.length);
    }
    this.reload();
  }

  protected updateCache(visit: CacheVisitor) {
    visit((cacheCol, cacheRow, cache, colsCache: Array<Column>) => {
      if (cache.cells != null)
        return;

      this.fillCache(cacheCol, cacheRow, cache.cells = [], (relCol, relRow, absCol, absRow) => {
        if (this.rowIds)
          absRow = this.rowIds[absRow];
        let value = this.getValue(absRow, absCol);
        return value == null ? '' : value;
      });
    });
    return null;
  }

  getUniqueValues(col: number) {
    let values: Object = {};
    for (let n = 0; n < this.json.length; n++) {
      let value = this.getValue(n, col);
      values[value] = values[value] + 1 || 1;
    }

    let rows: Array<Array<any>> = Object.keys(values).map((name, n) => ([n, name, values[name]]));
    rows.sort((a, b) => {
      if (a[1] > b[1])
        return 1;
      if (a[1] < b[1])
        return -1;
      return 0;
    });
    return new JSONSourceModel(rows, ['idx', 'name', 'cond']);
  }

  setSorting(columns: Array<SortColumn>) {
    this.sorting = assign([], columns);
    
    if (this.sorting == null || this.sorting.length == 0) {
      this.sortIds = null;
    } else {
      this.sortIds = Array(this.json.length);
      for (let n = 0; n < this.json.length; n++) {
        this.sortIds[n] = n;
      }

      let colIdx = this.getColumnIdx(columns[0].column);
      if (columns[0].dir != SortDir.natural) {
        this.sortIds.sort((a, b) => {
          if (this.json[a][colIdx] > this.json[b][colIdx])
            return 1;
          if (this.json[a][colIdx] < this.json[b][colIdx])
            return -1;
          return 0;
        });
      }
    }

    if (this.condition)
      this.setConditions(this.condition);
    else
      this.reload();
  }

  getSorting(): Array<SortColumn> {
    return this.sorting;
  }
}