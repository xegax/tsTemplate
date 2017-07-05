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
    return this.getImpl().appendToList(this.getId(), item.getId()).then(() => {
      this.arr.push(item);
    });
  }

  remove(idx: number) {
    return this.getImpl().removeFromList(this.getId(), idx).then(() => {
      this.arr.splice(idx, 1);
    });
  }

  getArray(): Array<T> {
    return this.arr.slice();
  }
}