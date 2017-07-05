import {ObjectFactory} from './object-factory';
import {Queue} from '../common/promise';

export interface ObjTable {
  id?: string;
  type: string;     // object, array
  subtype: string;  // class name
}

interface ListTable {
  id: string;
}

function timerPromise<T>(ms: number, callback: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(callback());
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
}

type Id2Object = {[id: string]: Object & {_: ObjTable}};
type Id2Array = {[id: string]: Array<string>};

export interface ObjectStoreAbstract {
  findObject(id: string): Promise<Object & {_: ObjTable}>;
  createObject(subtype: string): Promise<ObjTable>;
  createObjects(objsMap: {[id: string]: {json: Object, type: string}}): Promise<{[id: string]: string}>;
  
  write(id: string, json: Object): Promise<Object>;
  writeArray(id: string, arr: Array<any>): Promise<Array<string>>;
  appendToList(listId: string, objId: string): Promise<any>;
  removeFromList(listId: string, idx: number): Promise<any>;

  getObjectsFromList(id: string): Promise<Array<string>>;
  createList(): Promise<ObjTable>;
  loadObjects(id: string): Promise<{obj: Id2Object, list: Id2Array}>;
}

export class ObjectStore implements ObjectStoreAbstract {
  private idCounter: number = 0;
  private objStore: {[id: string]: ObjTable} = {};
  private table: {[name: string]: {[id: string]: Object}} = {};
  private list: {[id: string]: Array<ListTable>} = {};
  private factory: ObjectFactory;

  constructor(factory: ObjectFactory) {
    this.factory = factory;
    factory.getClasses().forEach(name => this.table[name] = {});
  }

  findObject(id: string) {
    return timerPromise<Object & {_: ObjTable}>(1, () => {
      const item = this.objStore[id];
      if (!item)
        throw `object ${id} not found`;

      if (item.type == 'array')
        return {_: {...item}};

      return {_: {...item}, ...this.table[item.subtype][id]};
    });
  }

  createObject(subtype: string): Promise<ObjTable> {
    return timerPromise<ObjTable>(1, () => {
      this.idCounter++;
      const id = '' + this.idCounter;
      this.objStore[id] = {type: 'object', subtype};
      if (!this.table[subtype])
        throw `table subtype=${subtype} not defined`;
      if (this.table[subtype][id])
        throw `object with id=${id} already defined`;
      this.table[subtype][id] = {};

      return {id, type: 'object', subtype};
    });
  }

  createObjects(objsMap: {[id: string]: {json: Object, type: string}}): Promise<{[id: string]: string}> {
    const res: {[id: string]: string} = {};
    const arr = Object.keys(objsMap).map(id => {
      if (objsMap[id].type != 'ListObj') {
        return () => this.createObject(objsMap[id].type).then(obj => {
          res[id] = obj.id;
          //return this.write(obj.id, objsMap[id].json);
        });
      } else {
        return () => this.createList().then(obj => {
          res[id] = obj.id;
        });
      }
    });
    
    return Queue.all(...arr).then(() => {
      return Queue.all(...Object.keys(objsMap).map(id => 
        () => {
          const desc = this.factory.get(objsMap[id].type);
          Object.keys(desc.objects).forEach(key => {
            if (['number', 'string'].indexOf(desc.objects[key]) == -1)
              objsMap[id].json[key] = res[objsMap[id].json[key]];
          });
          if (objsMap[id].type != 'ListObj')
            return this.write(res[id], objsMap[id].json);
        }
      ));
    }).then(() => {
      return res;
    });
  }

  write(id: string, json: Object): Promise<Object> {
    return timerPromise(1, () => {
      const item = this.objStore[id];
      if (!item)
        throw `object id=${id} not found`;

      if (item.type == 'array')
        throw `item id=${id} is not object`;

      const data = this.table[item.subtype][id];
      Object.keys(json).forEach(key => {
        data[key] = json[key];
      });
      return {...data};
    });
  }

  writeArray(id: string, arr: Array<any>): Promise<Array<string>> {
    return timerPromise(1, () => {
      const item = this.objStore[id];
      if (!item || !this.list[id])
        throw `list with id=${id} not found`;

      if (item.type != 'array')
        throw `id must be referrer to array`;

      this.list[id] = arr.map(id => ({id}));
      return this.list[id].map(item => item.id);
    });
  }

  appendToList(listId: string, objId: string): Promise<any> {
    return timerPromise(1, () => {
      const item = this.objStore[listId];
      if (!item || !this.list[listId])
        throw `list with id=${listId} not found`;

      if (item.type != 'array')
        throw `id must be referrer to array`;

      this.list[listId].push({id: objId});
    });
  }

  removeFromList(listId: string, idx: number): Promise<any> {
    return timerPromise(1, () => {
      const item = this.objStore[listId];
      if (!item || !this.list[listId])
        throw `list with id=${listId} not found`;

      if (item.type != 'array')
        throw `id must be referrer to array`;

      this.list[listId].splice(idx, 1);
    });
  }

  getObjectsFromList(id: string): Promise<Array<string>> {
    return timerPromise(1, () => {
      if (!this.list[id])
        throw `list with id=${id} not defined`;
      return this.list[id].map(item => item.id);
    });
  }

  createList(): Promise<ObjTable> {
    return timerPromise<ObjTable>(1, () => {
      this.idCounter++;
      const id = '' + this.idCounter;
      this.objStore[id] = {type: 'array', subtype: 'ListObj'};
      if (this.list[id])
        throw `list with id=${id} already defined`;
      this.list[id] = [];
      return {id, type: 'array', subtype: 'ListObj'};
    });
  }

  loadObjects(id: string) {
    const map = {
      obj: {},
      list: {}
    };
    const buildImpl = (id: string) => {
      return this.findObject(id).then(item => {
        const desc = this.factory.get(item._.subtype);
        map.obj[id] = item;
        const arr = [];
        if (item._.subtype == 'ListObj') {
          arr.push(() => {
            return this.getObjectsFromList(id).then(ids => {
              map.list[id] = ids;
              return Queue.all( ...ids.map(id => () =>
                buildImpl(id)
              ));
            });
          });
        } else {
          Object.keys(desc.objects).forEach(key => {
            const type = desc.objects[key];
            const id = item[key];
            if (type == 'ListObj') {
              arr.push(() => {
                return this.getObjectsFromList(id).then(ids => {
                  map.list[id] = ids;
                  return Queue.all( ...ids.map(id => () =>
                    buildImpl(id)
                  ));
                });
              });
            } else if (['number', 'string'].indexOf(type) == -1) {
              arr.push(() => buildImpl(id));
            }
          });
        }
        return Queue.all(...arr);
      }) as Promise<any>;
    };
    return buildImpl(id).then(() => {
      return map;
    });
  }
}
