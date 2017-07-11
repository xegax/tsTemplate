export type Id2Object = {[id: string]: Object & {_: ObjTable}};
export type Id2Array = {[id: string]: {items: Array<string>, count: number}};

export interface ObjTable {
  id?: string;
  type: string;     // object, array
  subtype: string;  // class name
}

export interface GetItemsParams {
  from?: number;
  count?: number;
}

export interface ObjectStoreInterface {
  findObject(id: string): Promise<Object & {_: ObjTable}>;
  createObject(subtype: string): Promise<ObjTable>;
  createObjects(objsMap: {[id: string]: {json: Object, type: string}}): Promise<{[id: string]: string}>;
  
  write(id: string, json: Object): Promise<Object>;
  writeArray(id: string, arr: Array<any>): Promise<Array<string>>;
  appendToList(listId: string, objId: string, idx?: number): Promise<any>;
  removeFromList(listId: string, idx: number): Promise<any>;

  getListSize(id: string): Promise<number>;
  getObjectsFromList(id: string, params?: GetItemsParams): Promise<Array<string>>;
  createList(): Promise<ObjTable>;
  loadObjects(id: string, from?: number, count?: number): Promise<{obj: Id2Object, list: Id2Array}>;
}