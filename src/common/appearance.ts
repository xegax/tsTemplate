import {Timer} from 'common/timer';
import {isObject} from 'lodash';

export interface Appearance {
  setString(key: string, value: string);
  getString(key: string): string;

  setBool(key: string, value: boolean);
  getBool(key: string): boolean;

  setNumber(key: string, value: number);
  getNumber(key: string): number;

  setArray(key: string, value: Array<string>);
  getArray(key: string): Array<string>;

  putToMap(key: string, mapKey: string, mapValue: string);
  getFromMap(key: string, mapKey: string): string;
  getMap(key: string): {[key: string]: string}; 
}

class AppearanceBase implements Appearance {
  protected dataObj: Object;

  constructor(defaultData?: Object) {
    this.dataObj = defaultData || {};
  }

  protected setValue(key: string, value: any) {
    if (key in this.dataObj) {
      if (typeof value != typeof this.dataObj[key])
        throw 'Appearance value has different type';
      
      if (this.dataObj[key] !== value) {
        this.dataObj[key] = value;
        this.updatedKey(key);
      }
    } else {
      throw 'Appearance value not defined';
    }
  }

  protected getValue(key: string): any {
    return this.dataObj[key];
  }

  protected updatedKey(key: string) {
  }

  setString(key: string, value: string) {
    this.setValue(key, value);
  }

  getString(key: string): string {
    return this.getValue(key);
  }

  setBool(key: string, value: boolean) {
    this.setValue(key, value);
  }

  getBool(key: string): boolean {
    return this.getValue(key);
  }

  setNumber(key: string, value: number) {
    this.setValue(key, value);
  }

  getNumber(key: string): number {
    return this.getValue(key);
  }

  setArray(key: string, value: Array<string>) {
    this.setValue(key, value);
  }

  getArray(key: string): Array<string> {
    return this.getValue(key);
  }

  putToMap(key: string, mapKey: string, mapValue: string) {
    let map = this.dataObj[key];
    if (!isObject(map))
      throw 'Appearance value has different type';

    if (map[mapKey] == mapValue)
      return;

    map[mapKey] = mapValue;
    this.updatedKey(key);
  }

  getFromMap(key: string, mapKey: string): string {
    return this.getValue(key)[mapKey];
  }

  getMap(key: string): {[key: string]: string} {
    return this.getValue(key);
  }
}


export class AppearanceFromLocalStorage extends AppearanceBase {
  private objId: string;
  protected changedKeys: {[key: string]: number} = {};

  private timer = new Timer(() => this.flush());

  constructor(objId: string, defaultData: Object) {
    super(defaultData);
    this.objId = objId;

    Object.keys(this.dataObj).forEach(key => {
      const value = localStorage.getItem(this.getStorageKey(key));
      if (value != null)
        this.dataObj[key] = JSON.parse(value);
    });
  }

  protected updatedKey(key: string) {
    this.changedKeys[key] = (this.changedKeys[key] || 0) + 1
    this.timer.run(1000);
  }

  protected getStorageKey(key: string): string {
    return ['appr-', this.objId, '/', key].join('');
  }

  protected flush() {
    Object.keys(this.changedKeys).forEach(key => {
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(this.dataObj[key]));
    });
    this.changedKeys = {};
  }
}