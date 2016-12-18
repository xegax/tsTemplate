import {Publisher} from 'common/publisher';
import {assign} from 'lodash';

export interface Column {
  renderHeader?: (s: string, colIdx: number) => JSX.Element;
  render?: (s: string, raw: any, row: number) => JSX.Element;
  width?: number;
  label?: string;
  tooltip?: string;
}

interface ColumnHolder {
  column: Column;
}

export class ColumnsModel extends Publisher {
  static readonly CHANGED = 1;

  private map: {[name: string]: ColumnHolder} = Object.create(null);

  getColumnByName(name: string): Column {
    let holder = this.map[name];
    if (holder)
      return holder.column;
    return null;
  }

  setColumnByName(name: string, column: Column) {
    let changes = 0;
    let holder = this.map[name];
    if (holder == null) {
      this.map[name] = {
        column: assign({}, column)
      };
      changes++;
    } else {
      Object.keys(column).forEach(key => {
        if (holder.column[key] !== column[key]) {
          holder.column[key] = column[key];
          changes++;
        }
      });
    }
    
    if (changes)
      this.updateVersion(ColumnsModel.CHANGED, 1);
  }
}