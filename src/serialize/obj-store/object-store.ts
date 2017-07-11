import {ObjectFactory, isObjectType} from '../object-factory';
import {Queue} from '../../common/promise';
import {ListObj} from '../list-obj';
import {
  ObjectStoreInterface,
  ObjTable,
  GetItemsParams,
  Id2Object,
  Id2Array
} from './obj-store-interface';

export {
  ObjTable,
  GetItemsParams,
  ObjectStoreInterface
};

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

export abstract class ObjectStoreAbstract implements ObjectStoreInterface {
  abstract findObject(id: string): Promise<Object & {_: ObjTable}>;
  abstract createObject(subtype: string): Promise<ObjTable>;
  
  abstract write(id: string, json: Object): Promise<Object>;
  abstract writeArray(id: string, arr: Array<any>): Promise<Array<string>>;
  abstract appendToList(listId: string, objId: string, idx?: number): Promise<any>;
  abstract removeFromList(listId: string, idx: number): Promise<any>;

  abstract getListSize(id: string): Promise<number>;
  abstract getObjectsFromList(id: string, params?: GetItemsParams): Promise<Array<string>>;
  abstract createList(): Promise<ObjTable>;

  private factory: ObjectFactory;

  constructor(factory: ObjectFactory) {
    this.factory = factory; 
  }

  createObjects(objsMap: {[id: string]: {json: Object, type: string}}): Promise<{[id: string]: string}> {
    const res: {[id: string]: string} = {};
    const arr = Object.keys(objsMap).map(id => {
      const pushObjID = (obj: ObjTable) => res[id] = obj.id;
      const type = objsMap[id].type;
      if (type == 'ListObj') {
        return () => this.createList().then(pushObjID);
      } else {
        return () => this.createObject(type).then(pushObjID);
      }
    });
    
    return Queue.all(...arr).then(() => {
      return Queue.all(...Object.keys(objsMap).map(id => 
        () => {
          const desc = this.factory.get(objsMap[id].type);
          Object.keys(desc.objects).forEach(key => {
            if (isObjectType(desc.objects[key]))
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

  loadObjects(id: string, from?: number, count?: number) {
    const map: {obj: Id2Object, list: Id2Array} = {
      obj: {},
      list: {}
    };
    const buildImpl = (id: string) => {
      return this.findObject(id).then(item => {
        const desc = this.factory.get(item._.subtype);
        map.obj[id] = item;
        const arr = [];
        if (item._.subtype == 'ListObj') {
          arr.push(() => buildObjList(id));
        } else {
          Object.keys(desc.objects).forEach(key => {
            const type = desc.objects[key];
            const id = item[key];
            if (type == 'ListObj') {
              arr.push(() => buildObjList(id));
            } else if (isObjectType(type)) {
              arr.push(() => buildImpl(id));
            }
          });
        }
        return Queue.all(...arr);
      }) as Promise<any>;
    };

    const buildObjList = (id: string) => {
      return Queue.lastResult(
        () => this.getListSize(id),
        (count: number) => this.getObjectsFromList(id, {from: from || 0, count: ListObj.ITEMS_PER_CACHE}).then(ids => {
          map.list[id] = {items: ids, count};
          return Queue.all( ...ids.map(id => () =>
            buildImpl(id)
          ));
        })
      );
    };

    return buildImpl(id).then(() => map);
  }
}

export class ObjectStore extends ObjectStoreAbstract {
  private idCounter: number = 0;
  private objStore: {[id: string]: ObjTable} = {};
  private table: {[name: string]: {[id: string]: Object}} = {};
  private list: {[id: string]: Array<ListTable>} = {};

  constructor(factory: ObjectFactory) {
    super(factory);

    factory.getClasses().forEach(name => this.table[name] = {});
  }

  findObject(id: string) {
    return timerPromise<Object & {_: ObjTable}>(1, () => {
      const item = this.objStore[id];
      if (!item)
        throw `object ${id} not found`;

      if (item.type == 'ListObj')
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

  appendToList(listId: string, objId: string, idx?: number): Promise<any> {
    idx = idx || 0;
    return timerPromise(1, () => {
      const item = this.objStore[listId];
      if (!item || !this.list[listId])
        throw `list with id=${listId} not found`;

      if (item.type != 'array')
        throw `id must be referrer to array`;

      this.list[listId].splice(idx, 0, {id: objId});
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

  getObjectsFromList(id: string, params?: GetItemsParams): Promise<Array<string>> {
    return timerPromise(1, () => {
      if (!this.list[id])
        throw `list with id=${id} not defined`;
      return this.list[id].map(item => item.id);
    });
  }

  getListSize(id: string): Promise<number> {
    return timerPromise(1, () => {
      if (!this.list[id])
        throw `list with id=${id} not defined`;
      return this.list[id].length;
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
}
