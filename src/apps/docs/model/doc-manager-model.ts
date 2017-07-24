import {Serializer} from 'serialize/serializer';
import {DocList, DocBase, DocImage, DocText, DocDesc} from './document';
import {Queue} from 'common/promise';

export class DocManagerModel {
  private db: Serializer;
  private docList: DocList;

  private constructor() {}

  static make(db: Serializer): Promise<DocManagerModel> {
    let mgr = new DocManagerModel();
    mgr.db = db;

    return db.loadObject<DocList>('1').then((obj: DocList) => {
      mgr.docList = obj;
      return mgr;
    }).catch(err => {
      return db.makeObject<DocList>(DocList.getDesc().classId).then(obj => {
        mgr.docList = obj;
        return mgr;
      });
    });
  }

  createDoc(type: string, idx?: number, args?: Array<any>): Promise<DocDesc> {
    return Queue.lastResult(
      () => this.db.makeObject<DocBase>(type, args),
      (doc: DocBase) => this.db.makeObject<DocDesc>('DocDesc', [doc.getId(), type]),
      (desc: DocDesc) => this.docList.getList().append(desc, idx).then(() => desc)
    );
  }

  removeDoc(idx: number) {
    return this.docList.getList().remove(idx);
  }

  getList() {
    return this.docList.getList();
  }
}