import {createServer} from './server';
import {SQLObjectStore} from 'serialize/obj-store/sql-object-store';
import {ObjectFactory, ObjID} from 'serialize/object-factory';
import {ListObj} from 'serialize/list-obj';
import {Serializer, DirtyObjectsOrder} from 'serialize/serializer';
import {DocText, DocList, register, ServerSideData, FileObj} from 'apps/docs/model/document';
import {Database} from 'sqlite3';
import {Base64Encryptor} from 'common/encryptor';
import * as fs from 'fs';
import {Queue} from 'common/promise';

const srv = createServer({
  port: 8088,
  baseUrl: '/handler/'
});

let watchers = Array<(objs: DirtyObjectsOrder) => void>();

let factory = new ObjectFactory();
register(factory);

let store: SQLObjectStore;
SQLObjectStore.create(factory, 'data/obj-store.db').then(s => {
  store = s;
  store.setLog(false);

  db = new Serializer(store, factory);
  db.addObjectsListener((objs: DirtyObjectsOrder) => {
    console.log(`changing v=${objs.version}, watchers=${watchers.length}`);
    watchers.forEach((w, i) => {
      w(objs);
    });
  });
  
  db.loadObject<ServerSideData>('1')
    .then(setServerSideData)
    .catch(() => {
      db.makeObject<ServerSideData>(ServerSideData.getDesc().classId)
        .then(setServerSideData);
    });
});

let db: Serializer;
let serverSide: ServerSideData;

function setServerSideData(data: ServerSideData) {
  serverSide = data;
}

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
  handler(Queue.lastResult(
    () => store.write(params.post.id, params.post.json),
    () => db.loadObject(params.post.id),
    (obj: ObjID) => obj.modified(),
    () => 'ok'
  ), done, error);
});

srv.addJsonHandler<{}, GetID & {json: Array<any>}>('writeArray', (params, done, error) => {
  handler(store.writeArray(params.post.id, params.post.json), done, error);
});

srv.addJsonHandler<{}, {listId: string, objId: string, idx: number}>('appendToList', (params, done, error) => {
  handler(store.appendToList(params.post.listId, params.post.objId, params.post.idx), done, error);
});

srv.addJsonHandler<{}, {listId: string, idx: number}>('removeFromList', (params, done, error) => {
  handler(Queue.lastResult(
    () => db.loadObject<ListObj<any>>(params.post.listId),
    (list: ListObj<any>) => list.remove(params.post.idx),
    () => 'ok'
  ), done, error);
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

const files: {[id: string]: {fd: number, file: FileObj}} = {};

function getFilePath(file: FileObj) {
  return `data/store/${file.getId()}`;
}

srv.addJsonHandler<{}, {name: string, size: number, type: string}>('create-file', (params, done, error) => {
  const args = {
    size: +params.post.size,
    name: params.post.name,
    type: params.post.type
  };
  db.makeObject<FileObj>(FileObj.getDesc().classId, [args]).then(file => {
    const id = file.getId();
    files[id] = {file, fd: fs.openSync(getFilePath(file), 'a+')};
    done({id});
  });
});

srv.addDataHandler<{id: string}>('upload-file', (params, done) => {
  const file = files[params.get.id];
  if (params.post) {
    fs.writeSync(file.fd, params.post as any, 0, params.post.byteLength, params.offs);
  } else {
    serverSide.getFiles().append(file.file);
    fs.closeSync(file.fd);
    delete files[params.get.id];
    done('ok');
  }
});

srv.addJsonHandler<{version: number}, {}>('objects-watch', (params, done, error, closer) => {
  const watcher = (objs: DirtyObjectsOrder) => {
    if (params.get.version == objs.version) {
      console.log('skip', objs.version);
      return false;
    }

    console.log('>>>>>>>>>>>> send', objs.version);
    done(objs);
    return true;
  };

  const objs = db.getDirtyObjectsOrder();
  if (objs.version != params.get.version) {
    console.log('handle now', params.get.version);
    return done(objs);
  }

  if (!watcher(objs)) {
    watchers.push(watcher);
    closer.push(() => {
      watchers.splice(watchers.indexOf(watcher), 1);
    });
    console.log('handle later, watchers', watchers.length);
  }
});