import {ObjectStore} from './object-store';

export interface ObjContext {
  modified(obj: ObjID);
}

interface ObjData {
  id?: string;
  version?: number;
  ctx?: ObjContext;
}

export class ObjID {
  private __obj: ObjData = {
    id: '',
    version: 0,
    ctx: null
  };

  getId() {
    return this.__obj.id;
  }

  getVersion() {
    return this.__obj.version;
  }

  initObject(data: ObjData) {
    this.__obj.id = this.__obj.id || data.id;
    this.__obj.ctx = this.__obj.ctx || data.ctx;
  }

  getObjDesc(): ObjDesc {
    return this['__proto__'].constructor['getDesc']();
  }

  getClassName(): string {
    return this['__proto__'].constructor['name'];
  }

  getJSON(): Object {
    const json = {};
    const desc = this.getObjDesc();
    Object.keys(desc.objects).forEach(key => {
      if (['string', 'number'].indexOf(desc.objects[key]) != -1)
        json[key] = this[key];
    });

    return json;
  }

  modified() {
    this.__obj.version++;
    this.__obj.ctx && this.__obj.ctx.modified(this);
  }
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