import {Publisher} from 'common/publisher';

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
    this.model.updateVersion(FilterModel.Event.ADD_ITEM);
  }

  setItem(i: number, column: string, value: string) {
    if (i >= this.list.length)
      return console.error('index out of range');
    this.list[i].column = column;
    this.list[i].value = value;
    this.model.updateVersion(FilterModel.Event.SET_ITEM);
  }

  removeItem(i: number) {
    if (i >= this.list.length)
      return console.error('index out of range');
    this.list.splice(i, 1);
    this.model.updateVersion(FilterModel.Event.REMOVE_ITEM);
  }

  getItems(): Array<FilterItem> {
    return this.list.slice();
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
}