import {Requestor} from 'requestor/requestor';
import {ObjectStoreInterface, ObjTable, Id2Array, Id2Object} from './object-store-interface';
import {ObjectFactory} from '../object-factory';

export class RemoteObjectStore implements ObjectStoreInterface {
  private requestor: Requestor;

  constructor(requestor: Requestor) {
    this.requestor = requestor;
  }

  findObject(id: string): Promise<Object & {_: ObjTable}> {
    return this.requestor.sendJSON('findObject', {}, {id});
  }

  createObject(subtype: string): Promise<ObjTable> {
    return this.requestor.sendJSON<ObjTable>('createObject', {}, {subtype});
  }

  write(id: string, json: Object): Promise<Object> {
    return this.requestor.sendJSON('write', {}, {id, json});
  }

  writeArray(id: string, arr: Array<string>): Promise<Array<string>> {
    return this.requestor.sendJSON('writeArray', {}, {id, json: arr}).then(data => []);
  }

  appendToList(listId: string, objId: string, idx: number): Promise<any> {
    return this.requestor.sendJSON('appendToList', {}, {listId, objId, idx});
  }

  removeFromList(listId: string, idx: number): Promise<any> {
    return this.requestor.sendJSON('removeFromList', {}, {listId, idx});
  }

  getObjectsFromList(id: string): Promise<Array<string>> {
    return this.requestor.sendJSON('getObjectsFromList', {}, {id});
  }

  createList(): Promise<ObjTable> {
    return this.requestor.sendJSON('createList');
  }

  loadObjects(id: string, from?: number, count?: number): Promise<{obj: Id2Object, list: Id2Array}> {
    let params = {id};
    if (from != null)
        params['from'] = from;
    if (count != null)
        params['count'] = count;

    return this.requestor.sendJSON('loadObjects', {}, {...params});
  }

  createObjects(objsMap: {[id: string]: {json: Object, type: string}}): Promise<{[id: string]: string}> {
    return this.requestor.sendJSON('createObjects', {}, objsMap);
  }

  getListSize(listId: string): Promise<number> {
    return this.requestor.sendJSON('getListSize', {}, {id: listId});
  }
}
