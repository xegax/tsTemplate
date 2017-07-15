import {
  ObjectFactory,
  TypeDesc,
  ObjID,
  ObjContext,
  ObjDesc,
  isObjectType
} from './object-factory';
import {ObjectStoreInterface} from './obj-store/obj-store-interface';
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

  loadObjects(id: string) {
    return this.serializer.loadObject(id);
  }

  loadFromList(id: string, from: number, count: number) {
    return Queue.lastResult(
      () => this.serializer.loadObject(id, from, count),
      (list: ListObj<ObjID>) => list.getItems(from, count)
    );
  }
}

export class Serializer {
  private factory: ObjectFactory;
  private store: ObjectStoreInterface;
  private readonly listObjName: string = ListObj.getDesc().classId;
  private objCtxImpl: ObjContextImpl;
  private objects: {[id: string]: ObjID} = {};

  constructor(factory: ObjectFactory, store: ObjectStoreInterface) {
    this.factory = factory;
    this.store = store;
    this.objCtxImpl = new ObjContextImpl(this);
  }

  private newObject(desc: ObjDesc, args?: Array<any>, id?: string): ObjID {
    if (this.objects[id])
      return this.objects[id];

    const obj = desc.make<ObjID>(...args);
    obj.getImpl().initObject({ctx: this.objCtxImpl});
    if (id)
      this.objects[id] = obj;
    return obj;
  }

  getStore() {
    return this.store;
  }

  saveObjects(objs: Array<ObjID>) {
    objs.forEach(obj => {
      const desc = obj.getImpl().getObjDesc();
      if (desc.classId == this.listObjName) {
        return;
      }

      const json = {};
      Object.keys(desc.objects).forEach(k => {
        if (isObjectType(desc.objects[k]))
          json[k] = (obj[k] as ObjID).getId();
        else
          json[k] = obj[k];
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
    const ok = this.createDeep(obj).then(() => {
      this.objects[obj.getId()] = obj;
      return obj;
    });//Queue.all(...this.createDeep(obj)).then(() => obj);
    ok.catch(err => console.log(err));
    return ok;
  }

  loadObject<T extends ObjID>(id: string, from?: number, count?: number): Promise<T> {
    return this.loadDeep<T>(id, from, count);
  }

  private loadDeep<T>(id: string, from?: number, count?: number): Promise<T> {
    return this.store.loadObjects(id, from, count).then(deps => {
      const load = (id: string) => {
        let obj: ObjID;
        if (deps.list[id]) {
          let objs = [];
          obj = this.newObject(ListObj.getDesc(), [{
            total: deps.list[id].count,
            from: from || 0,
            items: deps.list[id].items.map(id => load(id))
          }]);
        } else {
          const item = deps.obj[id];
          const desc = this.factory.get(item._.subtype);
          obj = this.newObject(desc, [], id);
          Object.keys(desc.objects).forEach(key => {
            const type = desc.objects[key];
            if (isObjectType(type)) {
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
      id2Json[id] = {
        json: obj.getImpl().getJSON(),
        type: obj.getImpl().getClassName()
      };

      const desc = obj.getImpl().getObjDesc();
      Object.keys(desc.objects).forEach(key => {
        const type = desc.objects[key];
        if (isObjectType(type)) {
          id2Json[id].json[key] = fillMap(obj[key]);
        }
      });
      return id;
    };

    fillMap(obj);
    return this.store.createObjects(id2Json).then(map => {
      Object.keys(map).forEach(id => {
        this.objects[id] = id2Obj[id];
        id2Obj[id].getImpl().initObject({id: map[id], ctx: this.objCtxImpl});
      });
    });
  }
}
