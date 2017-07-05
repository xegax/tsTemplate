import {ObjectFactory, TypeDesc, ObjID, ObjContext, ObjDesc} from './object-factory';
import {ObjectStoreAbstract} from './object-store';
import {Queue} from '../common/promise';
import {ListObj} from './list-obj';
import {Timer} from '../common/timer';

const MAX_DIRTY_OBJ_ORDER = 50;

class ObjContextImpl implements ObjContext {
  private dirtyObjs: {[id: string]: ObjID} = {};
  private timer: Timer;
  private serializer: Serializer;

  private dirtyObjsOrder = {
    arr: Array<{id: string, version: number}>(),
    version: 0
  };

  constructor(serializer: Serializer) {
    this.timer = new Timer(this.saveAllDirty);
    this.serializer = serializer;
  }

  private updateDirtyOrder(objs: Array<ObjID>) {
    objs.forEach(obj => {
      const idx = this.dirtyObjsOrder.arr['findIndex'](item => item.id == obj.getId());
      const item = this.dirtyObjsOrder.arr[idx];
      if (item && obj.getImpl().getVersion() != item.version) {
        this.dirtyObjsOrder.arr.splice(idx, 1);
      } else if (item)
        return;

      this.dirtyObjsOrder.arr.push({id: obj.getId(), version: obj.getImpl().getVersion()});
    });

    if (this.dirtyObjsOrder.arr.length > MAX_DIRTY_OBJ_ORDER)
      this.dirtyObjsOrder.arr.splice(0, this.dirtyObjsOrder.arr.length - MAX_DIRTY_OBJ_ORDER);
    this.dirtyObjsOrder.version++;
    console.log(this.dirtyObjsOrder);
  }

  private saveAllDirty = () => {
    const objs = Object.keys(this.dirtyObjs).map(id => this.dirtyObjs[id]);
    this.updateDirtyOrder(objs);
    this.serializer.saveObjects(objs);
    this.dirtyObjs = {};
  }

  modified(obj: ObjID) {
    this.dirtyObjs[obj.getId()] = obj;
    if (!this.timer.isRunning())
      this.timer.run(5);
  }

  getStore() {
    return this.serializer.getStore();
  }
}

export class Serializer {
  private factory: ObjectFactory;
  private store: ObjectStoreAbstract;
  private readonly listObjName: string = ListObj.getDesc().classId;
  private objCtxImpl: ObjContextImpl;

  constructor(factory: ObjectFactory, store: ObjectStoreAbstract) {
    this.factory = factory;
    this.store = store;
    this.objCtxImpl = new ObjContextImpl(this);
  }

  private newObject(desc: ObjDesc, args?: Array<any>): ObjID {
    const obj = desc.make<ObjID>(...args);
    obj.getImpl().initObject({ctx: this.objCtxImpl});
    return obj;
  }

  getStore() {
    return this.store;
  }

  saveObjects(objs: Array<ObjID>) {
    objs.forEach(obj => {
      const desc = obj.getImpl().getObjDesc();
      if (desc.classId == this.listObjName) {
        const arr = ListObj.wrap(obj).getArray().map(item => item.getId());
        return console.log('save array', obj.getId(), arr);
        //return this.store.writeArray(obj.getId(), arr);
      }

      const json = {};
      Object.keys(desc.objects).forEach(k => {
        if (['string', 'number'].indexOf(desc.objects[k]) != -1)
          json[k] = obj[k];
        else
          json[k] = (obj[k] as ObjID).getId();
      });
      this.store.write(obj.getId(), json);
      console.log('save', obj.getId(), json);
    });
  }

  makeObject<T extends ObjID>(type: string, args?: Array<any>): Promise<T> {
    const desc = this.factory.get(type);
    // создаём всю иерархию объектов локально
    const obj = this.newObject(desc, args);

    //создаём всю иерархию объектов удалённо и выставляем ID локальным объектам соответствующие удалённым
    const ok = this.createDeep(obj).then(() => obj);//Queue.all(...this.createDeep(obj)).then(() => obj);
    ok.catch(err => console.log(err));
    return ok;
  }

  loadObject<T>(id: string): Promise<T> {
    return this.loadDeep<T>(id);
  }

  private loadDeep<T>(id: string): Promise<T> {
    return this.store.loadObjects(id).then(deps => {
      const load = (id: string) => {
        let obj: ObjID;
        if (deps.list[id]) {
          obj = this.newObject(ListObj.getDesc());
          deps.list[id].forEach(id => {
            obj['arr'].push(load(id));
          });
        } else {
          const item = deps.obj[id];
          const desc = this.factory.get(item._.subtype);
          obj = this.newObject(desc);
          Object.keys(desc.objects).forEach(key => {
            const type = desc.objects[key];
            if (['number', 'string'].indexOf(type) == -1) {
              const id = item[key];
              obj[key] = load(id);
            } else {
              obj[key] = item[key];
            }
          });
        }
        obj.getImpl().initObject({id});
        return obj;
      };
      return load(id) as any;
    });
  }

  // создаёт удалённые объекты и выставляет всей иерархии локальных объектов их ID
  // ошибка будет если хотябы 1 удалённый объект не создан
  private createDeep(obj: ObjID): Promise<any> {
    const id2Obj: {[id: string]: ObjID} = {};
    const id2Json: {[id: string]: {json: Object, type: string}} = {};

    let idCounter = 0;
    const fillMap = (obj: ObjID) => {
      const id = '' + (++idCounter);
      id2Obj[id] = obj;
      id2Json[id] = {json: obj.getImpl().getJSON(), type: obj.getImpl().getClassName()};

      const desc = obj.getImpl().getObjDesc();
      Object.keys(desc.objects).forEach(key => {
        const type = desc.objects[key];
        if (['number', 'string'].indexOf(type) == -1) {
          id2Json[id].json[key] = fillMap(obj[key]);
        }
      });
      return id;
    };

    fillMap(obj);
    return this.store.createObjects(id2Json).then(map => {
      Object.keys(map).forEach(id => {
        id2Obj[id].getImpl().initObject({id: map[id], ctx: this.objCtxImpl});
      });
    });
  }
}
