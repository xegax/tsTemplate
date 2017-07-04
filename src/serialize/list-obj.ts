import {ObjID, ObjDesc} from './object-factory';

export class ListObj<T extends ObjID> extends ObjID {
  private length: number = 0;
  private arr = Array<T>();

  static getDesc(): ObjDesc {
    return {
      classId: 'ListObj',
      objects: {
      },
      make: () => new ListObj()
    };
  }

  static wrap<T extends ObjID>(obj: ObjID): ListObj<T> {
    if (obj.getImpl().getClassName() != 'ListObj')
      throw `invalid ListObj`;
    return obj as ListObj<T>;
  }

  append(item: T) {
    this.arr.push(item);
    this.modified();
  }

  remove(item: T) {
    const i = this.arr.indexOf(item);
    if (i != -1) {
      this.arr.splice(i, 1);
      this.modified();
    }
  }

  getArray(): Array<T> {
    return this.arr.slice();
  }
}