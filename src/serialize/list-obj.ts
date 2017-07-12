import {ObjID, ObjDesc} from './object-factory';
import {Queue} from '../common/promise';

export class ListObj<T extends ObjID> extends ObjID {
  private length: number = 0;
  private cacheBlocks = Array<Array<T>>();
  private selectedRange = {from: 0, count: ListObj.ITEMS_PER_CACHE};

  static ITEMS_PER_CACHE = 1000;
  static getDesc(): ObjDesc {
    return {
      classId: 'ListObj',
      objects: {
      },
      make: (params: {total: number; from: number; items: Array<ObjID>}) => {
        if (params.from % ListObj.ITEMS_PER_CACHE != 0)
          throw `from must be aligned to ListObj.ITEMS_PER_CACHE`;

        let obj = new ListObj();
        obj.length = params.total;

        ListObj.copy(obj, params.from, params.items);
        return obj;
      }
    };
  }

  getItems(from: number, count: number): Array<ObjID> {
    let res = [];
    for (let n = from; n < Math.min(this.length, from + count); n++) {
      let block = this.idx2Block(n);
      res.push(this.cacheBlocks[block][n % ListObj.ITEMS_PER_CACHE]);
    }
    return res;
  }

  static copy<T extends ObjID>(dst: ListObj<T>, from: number, items: Array<T>) {
    for (let n = 0; n < items.length; n++) {
      let block = dst.idx2Block(n + from);
      let arr = dst.cacheBlocks[block] || (dst.cacheBlocks[block] = []);
      arr[(n + from) % ListObj.ITEMS_PER_CACHE] = items[n];
    }
  }

  static wrap<T extends ObjID>(obj: ObjID): ListObj<T> {
    if (obj instanceof ListObj)
      return obj as ListObj<T>;
    throw `invalid ListObj`;
  }

  getSelected() {
    return {
      ...this.selectedRange
    };
  }

  getSelectedItems() {
    return this.getItems(this.selectedRange.from, this.selectedRange.count);
  }

  selectRange(from: number, count: number): Promise<any> {
    if (count > ListObj.ITEMS_PER_CACHE * 2)
      throw `count must be less than ${ListObj.ITEMS_PER_CACHE}`;

    this.selectedRange.from = from;
    this.selectedRange.count = count;
    return this.reloadRange();
  }

  append(item: T, idx?: number) {
    idx = idx || 0;
    return Queue.lastResult(
      () => this.getImpl().appendToList(this.getId(), item.getId(), idx),
      (newLength: number) => {
        this.length = newLength;
        this.cacheBlocks = [];
      },
      () => this.reloadRange()
    );
  }

  remove(idx: number) {
    return Queue.all(
      () => this.getImpl().removeFromList(this.getId(), idx),
      (newLength: number) => {
        this.length = newLength;
        this.cacheBlocks = [];
      },
      () => this.reloadRange()
    );
  }

  getLength(): number {
    return this.length;
  }

  get(idx: number): T {
    const block = this.idx2Block(idx);
    if (!this.cacheBlocks[block])
      return null;
    return this.cacheBlocks[block][idx % ListObj.ITEMS_PER_CACHE];
  }

  private reloadRange() {
    return new Promise((resolve, reject) => {
      let {from, count} = this.selectedRange;
      const fromBlock = this.idx2Block(from);
      const blocks = this.idx2Block(from + count - 1) - fromBlock + 1;

      const task = [];
      for (let n = fromBlock; n < fromBlock + blocks; n++) {
        if (this.cacheBlocks[fromBlock])
          continue;
        
        task.push(() => this.getImpl().loadFromList(this.getId(), this.block2idx(n), ListObj.ITEMS_PER_CACHE));
        task.push((items: Array<T>) => {
          this.cacheBlocks[n] = items;
        });
      }
      
      return Queue.all(...task).then(() => resolve(this.getItems(from, count)));
    });
  }

  private idx2Block(idx: number): number {
    return Math.floor(idx / ListObj.ITEMS_PER_CACHE);
  }

  private block2idx(block: number) {
    return block * ListObj.ITEMS_PER_CACHE;
  }
}