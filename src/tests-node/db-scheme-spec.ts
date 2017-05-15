import {Type, ObjScheme} from '../examples/storage/obj-scheme';
import {
  createScheme,
  ListImpl,
  ServerList,
  ServerObj,
  StorageScheme,
  ObjId,
  ObjItem,
  ObjRelItem
} from '../examples/storage/db-scheme';
import * as fs from 'fs';
import {Database} from 'sqlite3';
import {Queue} from '../common/promise';

const testScheme: ObjScheme = {
  'DocContainer': {
    fields: {
      name: Type.string,
      doc: 'DocBase'
    }
  },
  'DocBase': {
    fields: {
      flag: Type.integer
    }
  },
  'DocSlides': {
    extends: 'DocBase',
    fields: {
      desc: Type.string,
      pages: {type: Type.list, subType: 'SlidePage'}
    }
  },
  'DocText': {
    extends: 'DocBase',
    fields: {
      author: Type.string,
      lines: Type.integer,
      text: Type.string
    }
  },
  'SlidePage': {
    fields: {
      width: Type.double,
      height: Type.double,
      objects: {type: Type.list, subType: 'Obj2D'}
    }
  },
  'Obj2D': {
    fields: {
      label: Type.string,
      x: Type.double,
      y: Type.double,
      width: Type.double,
      height: Type.double
    }
  }
};

const dbFile = '--test.db';
let scheme: StorageScheme;
describe('db-scheme', () => {

  fs.existsSync(dbFile) && fs.unlinkSync(dbFile);

  describe('createDatabase', () => {
    it('db file must not be exists', () => {
      expect(fs.existsSync(dbFile)).toBeFalsy();
    });
  });

  describe('work with root ServerList', () => {
    let root: ServerList;
    let objs = [
      ['DocSlides', {desc: 'title'}],
      ['DocText', {text: 'some text'}],
      ['DocSlides', {desc: 'frame body'}],
      ['DocSlides', {desc: 'frame body 2'}],
      ['DocSlides', {desc: 'end'}],
      ['DocText', {text: ''}]
    ];

    it('init Database', done => {
      createScheme(dbFile, testScheme).then(store => {
        scheme = store;
        expect(store).not.toBeNull();
        expect(fs.existsSync(dbFile)).toBeTruthy();
        done();
      });
    });

    describe('StorageScheme.createObject, moveObj', () => {
      let textObj, contObj1, contObj2: number;
      it('createObject, moveObj', done => {
        Queue.all([
          () => scheme.createObject('DocText', {text: 'manual'}).then((obj: ObjItem) => textObj = obj.id),
          () => scheme.createObject('DocContainer', {name: 'cont1'}).then((obj: ObjItem) => contObj1 = obj.id),
          () => scheme.createObject('DocContainer', {name: 'cont2'}).then((obj: ObjItem) => contObj2 = obj.id),
          (objs: Array<ObjItem>) => {
            return scheme.moveObject(textObj, contObj1, 'doc');
          },
          (rel: ObjRelItem) => {
            expect(rel.id).not.toBeNull();
            return scheme.moveObject(textObj, contObj2, 'doc');
          },
          () => done()
        ]).catch(err => {
          done();
          expect(err).toBeNull();
        });
      });

      it('createObject, moveObject with err', done => {
        Queue.all([
          () => scheme.createObject('DocText', {text: 'text'}).then((obj: ObjId) => textObj = obj.id),
          () => scheme.createObject('DocContainer', {name: 'cont1'}).then((obj: ObjId) => contObj1 = obj.id),
          (objs: Array<ObjId>) => {
            return scheme.moveObject(textObj, contObj1, 'xxyy');
          }
        ]).catch(err => {
          done();
          expect(err).not.toBeNull();
        });
      });

      it('createContainer with valid reference', done => {
        let doc: number;
        Queue.all([
          () => scheme.createObject('DocText', {text: 'some text doc'}),
          (obj: ObjItem) => (doc = obj.id) && scheme.createObject('DocContainer', {name: 'doc1', doc: obj.id}),
          (obj: ObjItem) => {
            done();
            expect(obj).toEqual({id: obj.id, doc, name: 'doc1'});
          }
        ]).catch(err => {
          done();
          expect(err).toBeNull();
        });
      });

      it('createContainer with invalid type of doc', done => {
        let doc: number;
        Queue.all([
          () => scheme.createObject('SlidePage', {width: 100, height: 50}),
          (obj: ObjItem) => (doc = obj.id) && scheme.createObject('DocContainer', {name: 'doc1', doc: obj.id})
        ]).catch(err => {
          done();
          expect(err).toEqual('key=doc has no valid type, it must be extended from DocBase');
        });
      });

      it('createContainer with invalid id of doc', done => {
        Queue.all([
          (obj: ObjItem) => scheme.createObject('DocContainer', {name: 'doc1', doc: 56})
        ]).catch(err => {
          done();
          expect(err).toEqual('objects are not found: 56');
        });
      });
    });

    /*it('check with objects', done => {
      const types = ['DocSlides', 'Doc', '', '', ''];
      root.getObject(3).then(obj => {
        expect(obj.getType()).toBe('DocSlides');
      });
    });*/
  });

  afterAll(() => {
    console.log('finish, closing db');
    scheme.getDB().close();
  });
});