import {Publisher} from 'common/publisher';
import {FilterCondition} from 'table/filter-condition';

type FilterItemType = 'cat' | 'text';
export interface FilterItem {
  column: string;
  value: string;
}

export class FilterList {
  private list = Array<FilterItem>();
  private model: FilterModel;

  constructor(model: FilterModel) {
    this.model = model;
  }

  addItem(column: string, value: string) {
    this.list.push({
      column, value
    });
    this.model.updateVersion(FilterModel.Event.ADD_ITEM, 5);
  }

  setItem(i: number, column: string, value: string) {
    if (i >= this.list.length)
      return console.error('index out of range');
    this.list[i].column = column;
    this.list[i].value = value;
    this.model.updateVersion(FilterModel.Event.SET_ITEM, 5);
  }

  removeItem(i: number) {
    if (i >= this.list.length)
      return console.error('index out of range');
    this.list.splice(i, 1);
    this.model.updateVersion(FilterModel.Event.REMOVE_ITEM, 5);
  }

  getItems(): Array<FilterItem> {
    return this.list.slice();
  }

  clear() {
    this.list.splice(0, this.list.length);
    this.model.updateVersion(FilterModel.Event.REMOVE_ITEM, 5);
  }
}

export class FilterModel extends Publisher {
  static readonly Event = {
    ADD_ITEM: 1 << 0,
    SET_ITEM: 1 << 1,
    REMOVE_ITEM: 1 << 2
  };

  private include = new FilterList(this);
  private exclude = new FilterList(this);

  getInclude(): FilterList {
    return this.include;
  }

  getExclude(): FilterList {
    return this.exclude;
  }

  makeCondition(): FilterCondition {
    let inclMap: {[column: string]: Array<string>} = {};
    this.include.getItems().forEach(item => {
       (inclMap[item.column] || (inclMap[item.column] = [])).push(item.value);
    });

    let inclCond = Object.keys(inclMap).map(column => {
      return {
        column,
        catValues: inclMap[column]
      };
    });

    let exclMap: {[column: string]: Array<string>} = {};
    this.exclude.getItems().forEach(item => {
      (exclMap[item.column] || (exclMap[item.column] = [])).push(item.value);
    });
    
    let exclCond = Object.keys(exclMap).map(column => {
      return {
        inverse: true,
        column,
        catValues: exclMap[column]
      };
    });

    if (inclCond.length && !exclCond.length) {
      return {
        op: 'and',
        condition: inclCond
      };
    } else if (inclCond.length && exclCond.length) {
      return {
        op: 'and',
        condition: [
          {
            op: 'and',
            condition: inclCond
          }, {
            op: 'and',
            condition: exclCond
          }
        ] 
      };
    } else if (!inclCond.length && exclCond.length) {
      return {
        op: 'and',
        condition: exclCond
      };
    }

    return null;
  }
}