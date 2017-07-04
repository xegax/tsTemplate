import {createServer} from './server';
import {ObjectStore} from '../serialize/object-store';
import {SQLObjectStore} from '../serialize/sql-object-store';
import {ObjectFactory} from '../serialize/object-factory';
import {ListObj} from '../serialize/list-obj';
import {DocText, DocList, register} from '../serialize/document';
import {Database} from 'sqlite3';

const srv = createServer(8088);

let factory = new ObjectFactory();
register(factory);

let store: ObjectStore;
const db = new Database('data/obj-store.db', (err) => err && console.log(err));
SQLObjectStore.create(factory, db).then(s => store = s);

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

srv.addJsonHandler<GetID, {}>('/handler/findObject', (params, done, error) => {
  handler(store.findObject(params.get.id), done, error);
});

srv.addJsonHandler<{subtype: string}, {}>('/handler/createObject', (params, done, error) => {
  handler(store.createObject(params.get.subtype), done, error);
});

srv.addJsonHandler<GetID, {}>('/handler/write', (params, done, error) => {
  handler(store.write(params.get.id, params.post), done, error);
});

srv.addJsonHandler<GetID, Array<any>>('/handler/writeArray', (params, done, error) => {
  handler(store.writeArray(params.get.id, params.post), done, error);
});

srv.addJsonHandler<GetID, {}>('/handler/getObjectsFromList', (params, done, error) => {
  handler(store.getObjectsFromList(params.get.id), done, error);
});

srv.addJsonHandler<{}, {}>('/handler/createList', (params, done, error) => {
  handler(store.createList(), done, error);
});

srv.addJsonHandler<GetID, {}>('/handler/loadObjects', (params, done, error) => {
  handler(store.loadObjects(params.get.id), done, error);
});

srv.addJsonHandler<{}, {}>('/handler/createObjects', (params, done, error) => {
  handler(store.createObjects(params.post), done, error);
});
