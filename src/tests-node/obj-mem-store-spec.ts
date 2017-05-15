import {
  getRoot,
  initScheme,
  ListStore,
  Type
} from '../examples/storage/obj-mem-store';

xdescribe('obj-mem-store', () => {
  let docList: ListStore;
  it('initScheme', () => {
    initScheme({
      'Document': {
        fields: {
          name: Type.string,
          dummy: Type.string
        }
      },
      'TestType': {
        fields: {
          intKey: Type.integer,
          doubleKey: Type.double
        }
      }
    });
  });

  it('get root', done => {
    getRoot().then(root => {
      docList = root;
      expect(docList).toBeDefined();
      done();
    });
  });

  it('add invalid object', done => {
    expect(docList.getCount()).toBe(0);
    let resolve = jasmine.createSpy('resolve');
    let reject = jasmine.createSpy('reject');
    docList.addObject('TestType2').then(resolve).catch(reject);
  });

  it('add object', done => {
    expect(docList.getCount()).toBe(0);
    const objType = 'TestType';
    docList.addObject(objType, {intKey: 51, doubleKey: 55.5}).then(obj => {
      expect(docList.getCount()).toBe(1);
      expect(obj.getType()).toEqual(objType);
      expect(obj.getJSON()).toEqual({intKey: 51, doubleKey: 55.5});
      done();
    });
  });
});