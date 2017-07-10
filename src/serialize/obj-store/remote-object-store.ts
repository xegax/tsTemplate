import {Requestor} from 'requestor/requestor';
import {ObjectStoreInterface, ObjTable} from './object-store';
import {ObjectFactory} from '../object-factory';

export class RemoteObjectStore implements ObjectStoreInterface {
  private requestor: Requestor;

  constructor(requestor: Requestor) {
    this.requestor = requestor;
  }

  findObject(id: string) {
    return this.requestor.getJSON('/findObject', {id});
  }

  createObject(subtype: string): Promise<ObjTable> {
    return this.requestor.getJSON<ObjTable>('/createObject', {subtype});
  }

  write(id: string, json: Object): Promise<Object> {
    return this.requestor.sendData('/write', {id}, JSON.stringify(json));
  }

  writeArray(id: string, arr: Array<string>): Promise<Array<string>> {
    return this.requestor.sendData('/writeArray', {id}, JSON.stringify(arr)).then(data => []);
  }

  appendToList(listId: string, objId: string, idx: number) {
    return this.requestor.getJSON('/appendToList', {listId, objId, idx});
  }

  removeFromList(listId: string, idx: number) {
    return this.requestor.getJSON('/removeFromList', {listId, idx});
  }

  getObjectsFromList(id: string): Promise<Array<string>> {
    return this.requestor.getJSON('/getObjectsFromList', {id});
  }

  createList(): Promise<ObjTable> {
    return this.requestor.getJSON('/createList');
  }

  loadObjects(id: string) {
    return this.requestor.getJSON('/loadObjects', {id});
  }

  createObjects(objsMap: {[id: string]: {json: Object, type: string}}) {
    return this.requestor.sendData('/createObjects', {}, JSON.stringify(objsMap)).then(data => JSON.parse(data));
  }

  getListSize(listId: string) {
    return this.requestor.getJSON('/getListSize', {id: listId});
  }
}
