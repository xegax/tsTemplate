import {Requestor} from 'requestor/requestor';
import {ObjectStoreAbstract, ObjTable} from './object-store';
import {ObjectFactory} from './object-factory';

export class RemoteObjectStore implements ObjectStoreAbstract {
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
}
