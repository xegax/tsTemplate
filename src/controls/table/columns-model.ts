import {Publisher} from 'common/publisher';
import {assign, isEqual} from 'lodash';
import {ColumnType} from 'model/table-source-model';
import {Appearance} from 'common/appearance';

export interface Column {
  renderHeader?: (s: string, colIdx: number) => JSX.Element;
  render?: (s: string, raw: any, row: number) => JSX.Element;
  width?: number;
  label?: string;
  tooltip?: string;
  type?: ColumnType;
}

interface ColumnHolder {
  column: Column;
}

export class ColumnsModel extends Publisher {
  static readonly EVENT_CHANGED = 1 << 0;
  static readonly EVENT_WIDTH   = 1 << 1;

  private map: {[name: string]: ColumnHolder} = {};
  private appr: Appearance;

  constructor(map?: {[name: string]: Column}, appr?: Appearance) {
    super();

    if (map != null)
      this.insertColumns(map);

    this.appr = appr;
    if (appr) {
      let apprMap = appr.getMap('sizes');
      Object.keys(apprMap).forEach(name => {
        let col = this.getOrCreateHolder(name);
        col.column.width = +apprMap[name];
      });
    }
  }

  getColumn(name: string): Column {
    let holder = this.map[name];
    if (holder)
      return assign({}, holder.column);
    return null;
  }

  setColumn(name: string, column: Column) {
    let holder = this.getOrCreateHolder(name);
    if (isEqual(holder.column, column))
      return;

    holder.column = assign(holder.column, column);
    this.updateVersion(ColumnsModel.EVENT_CHANGED, 1);
  }

  insertColumns(map: {[name: string]: Column}) {
    Object.keys(map).forEach(name => this.setColumn(name, map[name]));
  }

  setColumnSize(name: string, size: number) {
    let holder = this.getOrCreateHolder(name);
    if (holder.column.width == size)
      return;

    if (this.appr) {
      this.appr.putToMap('sizes', name, '' + size);
    }

    holder.column.width = size;
    this.updateVersion(ColumnsModel.EVENT_WIDTH, 1);
  }

  private getOrCreateHolder(name: string, newColumn?: Column): ColumnHolder {
    return this.map[name] || (this.map[name] = {column: assign({}, newColumn)});
  }
}