import {Serializer} from 'serialize/serializer';
import {DocList, DocBase, DocImage, DocText} from './document';
import {Queue} from 'common/promise';

export class DocManagerModel {
  private db: Serializer;
  private docList: DocList;

  private constructor() {}

  static make(db: Serializer): Promise<DocManagerModel> {
    let mgr = new DocManagerModel();
    mgr.db = db;

    return db.loadObject('1').then((obj: DocList) => {
      mgr.docList = obj;
      return mgr;
    }).catch(err => {
      return db.makeObject<DocList>(DocList.getDesc().classId).then(obj => {
        mgr.docList = obj;
        return mgr;
      });
    });
  }

  createDoc<T extends DocBase>(type: string, idx?: number, args?: Array<any>): Promise<T> {
    return Queue.lastResult(
      () => this.db.makeObject(type, args),
      (doc: DocBase) => this.docList.getList().append(doc, idx).then(() => doc)
    );
  }

  removeDoc(idx: number) {
    return this.docList.getList().remove(idx);
  }

  getList() {
    return this.docList.getList();
  }
}