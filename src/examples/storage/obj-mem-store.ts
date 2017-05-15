import {
  ObjStore,
  ListStore,
  ObjBaseStore
} from './obj-store';
import {ObjScheme, validate, Type} from './obj-scheme';
import {IThenable} from 'promise';
import {assign} from 'lodash';

export {
  Type,
  ListStore,
  ObjScheme
};

interface Owner {
  parentId: string;
  key?: string;
}

interface Range {
  from?: number;
  count?: number;
}

class ObjIdCounter {
  private idCounter: number = 0;
  constructor(idCounter: number = 0) {
    this.idCounter = idCounter;
  }

  getNextId(): number {
    const id = this.idCounter;
    this.idCounter++;
    return id;
  }
}

class ObjStorage {
  private arr = Array<ObjBaseImpl>();
  private map: {[id: string]: ObjBaseImpl} = {};

  get(id: string): ObjBaseImpl {
    return this.map[id];
  }

  put(obj: ObjBaseImpl) {
    this.map[obj.getId()] = obj;
  }
}

class ObjBaseImpl implements ObjBaseStore {
  private store = {
    id: '' + idCounter.getNextId(),
    type: 'object',
    subtype: '',
    version: 0
  };
  private json = {};

  constructor(type: string, subtype: string, json?: Object) {
    if (type != Type.list && currScheme[type] == null)
      throw `object type='${type}' has not registered`;

    this.store.type = type;
    this.store.subtype = subtype;
    this.json = assign({}, json);
  }

  getId(): string {
    return this.store.id;
  }

  getParentId(): string {
    return null;
  }

  getType(): string {
    return this.store.type;
  }

  getSubtype(): string {
    return this.store.subtype;
  }
  
  getVersion() {
    return this.store.version;
  }

  getJSON() {
    return assign({}, this.json);
  }
}

class Relations {
  private arr: Array<{parentId: string; name: string; childId: string;}> = [];

  addRelation(parentId: string, name: string, childId: string) {
    this.arr.push({parentId, name, childId});
  }

  getCount(parentId: string, name: string) {
    let count = 0;
    this.arr.forEach(rel => {
      if (rel.parentId == parentId && rel.name == name)
        count++;
    });
    return count;
  }

  getObjects(parentId: string, name: string, range?: Range): Array<string> {
    range = assign({from: 0, count: null}, range);
    let offs = 0;
    let arr = Array<string>();
    this.arr.forEach(rel => {
      if (rel.parentId == parentId && rel.name == name) {
        if (offs >= range.from)
          arr.push(rel.childId);

        if (arr.length == range.count)
          return arr;

        offs++;
      }
    });
    return arr;
  }
}

let idCounter = new ObjIdCounter();
let currScheme: ObjScheme = null;
let root: ListStoreImpl = null;
let map = new ObjStorage();
let rels = new Relations();

export function initScheme(scheme: ObjScheme) {
  validate(scheme);
  currScheme = scheme;
}

export function getRoot(): IThenable<ListStore> {
  return new Promise((resolve, reject) => resolve(root = new ListStoreImpl('document')));
}

class ObjStoreImpl extends ObjBaseImpl implements ObjStore {
  private parent: Owner;

  constructor(type: string, subtype?: string, owner?: Owner, json?: any) {
    super(type, subtype, json);
    this.parent = owner;
  }

  setValue(name: string, value: string) {
  }

  getValue(name: string): string {
    return null;
  }

  getList(name: string): IThenable<ListStore> {
    return null;
  }

  getObject(name: string): IThenable<ObjStore> {
    return null;
  }
}

// parentId -> list -> child1, child2, child3
class ListStoreImpl extends ObjBaseImpl implements ListStore {
  private owner: Owner;

  constructor(subtype: string, parent?: Owner) {
    super('list', subtype);
    this.owner = parent;
  }

  private getParentKey(): string {
    if (!this.owner)
      return null;
    return this.owner.key;
  }

  getCount(): number {
    return rels.getCount(this.getId(), this.getParentKey());
  }
  
  getRange(from?: number, count?: number): IThenable<Array<ObjStore>> {
    return new Promise((resolve, reject) => {
      resolve(rels.getObjects(this.getId(), this.getParentKey(), {from, count}).map(id => {
        return map.get(id);
      }));
    });
  }

  addObject(type: string, json?: any): IThenable<ObjStore> {
    return new Promise((resolve, reject) => {
      let obj = new ObjStoreImpl(type, null, {parentId: this.getId()}, json);
      map.put(obj);
      rels.addRelation(this.getId(), null, obj.getId());
      resolve(obj);
    });
  }

  removeObject(id: string) {
  }
}