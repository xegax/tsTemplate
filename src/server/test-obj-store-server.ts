import {createServer} from './server';
import {SQLObjectStore} from 'serialize/obj-store/sql-object-store';
import {ObjectFactory} from 'serialize/object-factory';
import {ListObj} from 'serialize/list-obj';
import {DocText, DocList, register} from 'apps/docs/model/document';
import {Database} from 'sqlite3';
import {Base64Encryptor} from 'common/encryptor';

const srv = createServer({
  port: 8088,
  baseUrl: '/handler/'
});

let factory = new ObjectFactory();
register(factory);

let store: SQLObjectStore;
SQLObjectStore.create(factory, 'data/obj-store.db').then(s => {
  store = s;
  store.setLog(true);
});


interface GetID {
  id: string;
}

function handler(promise: Promise<any>, done, error) {
  promise.then(res => {
    done(res);
  }).catch(e => {
    error(e);
  });
}

srv.addJsonHandler<{}, GetID>('findObject', (params, done, error) => {
  handler(store.findObject(params.post.id), done, error);
});

srv.addJsonHandler<{}, {subtype: string}>('createObject', (params, done, error) => {
  handler(store.createObject(params.post.subtype), done, error);
});

srv.addJsonHandler<{}, GetID & {json: Object}>('write', (params, done, error) => {
  handler(store.write(params.post.id, params.post.json), done, error);
});

srv.addJsonHandler<{}, GetID & {json: Array<any>}>('writeArray', (params, done, error) => {
  handler(store.writeArray(params.post.id, params.post.json), done, error);
});

srv.addJsonHandler<{}, {listId: string, objId: string, idx: number}>('appendToList', (params, done, error) => {
  handler(store.appendToList(params.post.listId, params.post.objId, params.post.idx), done, error);
});

srv.addJsonHandler<{}, {listId: string, idx: number}>('removeFromList', (params, done, error) => {
  handler(store.removeFromList(params.post.listId, params.post.idx), done, error);
});

srv.addJsonHandler<{}, GetID>('getObjectsFromList', (params, done, error) => {
  handler(store.getObjectsFromList(params.post.id), done, error);
});

srv.addJsonHandler<{}, {}>('createList', (params, done, error) => {
  handler(store.createList(), done, error);
});

srv.addJsonHandler<{}, {id: string, from: number, count: number}>('loadObjects', (params, done, error) => {
  handler(store.loadObjects(params.post.id, +params.post.from, +params.post.count), done, error);
});

srv.addJsonHandler<{}, {}>('createObjects', (params, done, error) => {
  handler(store.createObjects(params.post), done, error);
});

srv.addJsonHandler<{}, GetID>('getListSize', (params, done, error) => {
  handler(store.getListSize(params.post.id), done, error);
});