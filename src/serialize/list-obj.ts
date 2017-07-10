import {ObjID, ObjDesc} from './object-factory';
import {Queue} from '../common/promise';

export class ListObj<T extends ObjID> extends ObjID {
  private length: number = 0;
  private arr = Array<T>();

  static MAX_LOAD_ITEMS = 1000;
  static getDesc(): ObjDesc {
    return {
      classId: 'ListObj',
      objects: {
      },
      make: () => new ListObj()
    };
  }

  static wrap<T extends ObjID>(obj: ObjID): ListObj<T> {
    if (obj instanceof ListObj)
      return obj as ListObj<T>;
    throw `invalid ListObj`;
  }

  append(item: T, idx?: number) {
    idx = idx || 0;
    return Queue.all(
      () => this.getImpl().appendToList(this.getId(), item.getId(), idx),
      () => this.getImpl().loadObject(this.getId()),
      (list: ListObj<T>) => {
        this.arr = list.arr;
      }
    );
  }

  remove(idx: number) {
    return Queue.all(
      () => this.getImpl().removeFromList(this.getId(), idx),
      () => this.getImpl().loadObject(this.getId()),
      (list: ListObj<T>) => {
        this.arr = list.arr;
      }
    );
  }

  getLength(): number {
    return Math.max(this.arr.length, this.length);
  }

  getArray(): Array<T> {
    return this.arr.slice();
  }
}