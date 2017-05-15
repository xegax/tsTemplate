import {IThenable} from 'promise';

export interface ObjBaseStore {
  getType(): string;
  getSubtype(): string;

  getId(): string;
  getParentId(): string;
  getVersion(): number;
  
  getJSON(): Object;
}

export interface ObjStore extends ObjBaseStore {
  setValue(name: string, value: string);
  getValue(name: string): string;

  getList(name: string): IThenable<ListStore>;
  getObject(name: string): IThenable<ObjStore>;
}

export interface ListStore extends ObjBaseStore {
  getCount(): number;
  getRange(from?: number, count?: number): IThenable<Array<ObjStore>>;

  addObject(type: string, json?: any): IThenable<ObjStore>;
  removeObject(id: string);
}
