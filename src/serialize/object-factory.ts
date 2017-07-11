import {ObjectStoreInterface} from './obj-store/obj-store-interface';

export interface ObjContext {
  modified(obj: ObjID);
  getStore(): ObjectStoreInterface;
  loadObjects(id: string);
  loadFromList(id: string, from: number, count: number);
}

interface ObjData {
  id?: string;
  version?: number;
  ctx?: ObjContext;
}

class ObjIDImpl {
  private obj: ObjID;
  private id: string = '';
  private version = 0;
  private ctx: ObjContext;

  constructor(obj: ObjID) {
    this.obj = obj;
  }

  getId() {
    return this.id;
  }

  getVersion() {
    return this.version;
  }

  initObject(data: ObjData) {
    this.id = this.id || data.id;
    this.ctx = this.ctx || data.ctx;
  }

  getObjDesc(): ObjDesc {
    return this.obj['__proto__'].constructor['getDesc']();
  }

  getClassName(): string {
    return this.obj['__proto__'].constructor['name'];
  }

  getJSON(): Object {
    const json = {};
    const desc = this.getObjDesc();
    Object.keys(desc.objects).forEach(key => {
      if (['string', 'number'].indexOf(desc.objects[key]) != -1)
        json[key] = this.obj[key];
    });

    return json;
  }

  modified() {
    this.version++;
    this.ctx && this.ctx.modified(this.obj);
  }

  appendToList(listId: string, objId: string, idx: number) {
    this.modified();
    return this.ctx && this.ctx.getStore().appendToList(listId, objId, idx);
  }

  removeFromList(listId: string, idx: number) {
    this.modified();
    return this.ctx && this.ctx.getStore().removeFromList(listId, idx);
  }

  loadObject(id: string) {
    return this.ctx && this.ctx.loadObjects(id);
  }

  loadFromList(id: string, from: number, count: number) {
    return this.ctx && this.ctx.loadFromList(id, from, count);
  }
}

export class ObjID {
  private impl = new ObjIDImpl(this);

  getId() {
    return this.impl.getId();
  }

  modified() {
    return this.impl.modified();
  }

  getImpl() {
    return this.impl;
  }
}

export const ValueType = {
  string: 'string',
  number: 'number',
  integer: 'integer'
};

export function isObjectType(type: string) {
  return [
    ValueType.integer,
    ValueType.number,
    ValueType.string
  ].indexOf(type) == -1;
}

export interface ObjDesc {
  classId: string;
  objects: {
    [key: string]: string;
  };
  make<T>(...args): T;
}

export interface TypeDesc {
  getDesc?: () => ObjDesc;
}

export class ObjectFactory {
  private objsMap: {[classId: string]: ObjDesc} = {};

  register(obj: TypeDesc) {
    const desc = obj.getDesc();
    this.objsMap[desc.classId] = desc;
  }

  get(name: string): ObjDesc {
    return this.objsMap[name];
  }

  getClasses(): Array<string> {
    return Object.keys(this.objsMap);
  }
}