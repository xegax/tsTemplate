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
  Abilities
} from 'model/table-source-model';
import {Publisher} from 'common/publisher';
import {Requestor, getGlobalRequestor} from 'requestor/requestor';
import {CompoundCondition, ColumnCondition, ConditionText, makeFilterFunction} from 'model/filter-condition';

export class JSONSourceModel extends TableSourceModelImpl {
  private json: Array<Object>;
  private columnNames = Array<string>();
  private rowIds: Array<number>;

  constructor(json: Array<Object>, prevModel?: TableSourceModel) {
    super(prevModel);
    this.initJSON(json);
  }

  private initJSON(json: Array<Object>) {
    this.json = json;

    if (json.length) {
      this.columnNames = Object.keys(json[0]);
    } else {
      this.columnNames = [];
    }
    this.setTotal(this.columnNames.length, json.length);
    this.updateColsCache();
  }

  static loadJSON(url: string, requestor?: Requestor): JSONSourceModel {
    if (!requestor)
      requestor = getGlobalRequestor();

    let model = new JSONSourceModel([]);
    requestor.getJSON(url).then(data => {
      model.initJSON(data);
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

  setConditions(condition: CompoundCondition | ColumnCondition) {
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
        for (let key in colIdxs)
          values[+key] = this.json[r][this.columnNames[+key]];

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
      if (cache.cells == null)
        this.fillCache(cacheCol, cacheRow, cache.cells = [], (relCol, relRow, absCol, absRow) => {
          if (this.rowIds)
            absRow = this.rowIds[absRow];
          return this.json[absRow][this.columnNames[absCol]]
        });
    });
    return null;
  }

  getUniqueValues(col: number) {
    let values: Object = {};
    for (let n = 0; n < this.json.length; n++) {
      let value = this.json[n][this.columnNames[col]];
      values[value] = values[value] + 1 || 1;
    }
    return new JSONSourceModel(
      Object.keys(values).map((name, n) => ({idx: n, name, count: values[name]}))
    );
  }
}