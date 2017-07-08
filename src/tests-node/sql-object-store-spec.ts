import {SQLObjectStore, ObjTable} from '../serialize/sql-object-store';
import {ObjectFactory, ObjID, ObjDesc} from '../serialize/object-factory';
import {DBPromise} from '../common/db-promise';
import {Database} from 'sqlite3';
import {Queue} from '../common/promise';
import {ListObj} from '../serialize/list-obj';
import * as fs from 'fs';

class TestObj extends ObjID {
  private name: string = '';
  private size: number = 0;

  static getDesc(): ObjDesc {
    return {
      classId: 'TestObj',
      objects: {
        name: 'string',
        size: 'number'
      },
      make: () => new TestObj()
    };
  }
}

const dbFile = 'data/test-store.db';
try {
  fs.unlinkSync('data/test-store.db');
} catch(e) {
}

function testMakeObject(store: SQLObjectStore, objs: Array<string>) {
  let time = Date.now();
  let res = Array<ObjTable>();
  return Queue.lastResult(
    ...objs.map(s => () => store.createObject(s).then(obj => res.push(obj))),
    () => {
      console.log('testMakeObject', Date.now() - time);
      expect(res.length).toBe(objs.length);
      return res;
    }
  );
}

function testListObject(store: SQLObjectStore, listId: string, objs: Array<ObjTable>) {
  let time = Date.now();
  return Queue.lastResult(
    ...objs.map(obj => () => store.appendToList(listId, obj.id)),
    (ids: Array<string>) => {
      console.log('testListObject', Date.now() - time);
      expect(ids).toEqual(objs.map(obj => obj.id));
    }
  )
}

function testRemoveFromList(store: SQLObjectStore, listId: string, objs: Array<ObjTable>) {
  let time = Date.now();
  return Queue.lastResult(
    ...objs.map(() => () => store.removeFromList(listId, 0)),
    (arr) => {
      console.log('testRemoveFromList', Date.now() - time);
      expect(arr.length).toBe(0);
    }
  );
}

describe('sql-object-store', () => {
  let factory = new ObjectFactory();
  let store: SQLObjectStore;

  it ('register factory objects', () => {
    expect(factory).not.toBeNull();
    factory.register(ListObj);
    factory.register(TestObj);

    expect(factory.getClasses()).toEqual(['ListObj', 'TestObj']);
  });

  it('initialize store', (done) => {
    SQLObjectStore.create(factory, dbFile).then(res => {
      done();
      store = res;
      store.setLog(false);
      expect(store).not.toBeNull();
      expect(store instanceof SQLObjectStore).toBeTruthy();
    });
  });

  describe('ListObj', () => {
    let list: ObjTable;
    let objs = Array<ObjTable>();

    it('ListObj', (done) => {
      let objClass = TestObj.getDesc().classId;
      let classes = [];
      while (classes.length < 10)
        classes.push(objClass);

      Queue.all(
        () => testMakeObject(store, classes).then((arr: Array<ObjTable>) => objs = arr),
        () => store.createList(),
        (lst: ObjTable) => {
          list = lst;
          return testListObject(store, list.id, objs);
        },
        () => testRemoveFromList(store, list.id, objs),
        () => testListObject(store, list.id, objs),
        () => testRemoveFromList(store, list.id, objs),
        () => testListObject(store, list.id, objs)
      ).then(() => done())
      .catch(e => {
        done();
        expect(e).toBeNull();
      });
    });

    it('remove, append', done => {
      Queue.all(
        () => store.removeFromList(list.id, 0),
        (arr) => expect(arr).toEqual(objs.slice(1).map(o => o.id)),
        () => store.appendToList(list.id, objs[0].id, 0),
        (arr) => expect(arr).toEqual(objs.map(o => o.id)),
        () => store.appendToList(list.id, objs[0].id),
        (arr) => expect(arr).toEqual(objs.concat(objs[0]).map(o => o.id)),
        () => store.removeFromList(list.id, objs.length),
        (arr) => expect(arr).toEqual(objs.map(o => o.id))
      ).then(() => {
        done();
      }).catch(err => {
        done();
        expect(err).toBeNull();
      });
    });

  });
})