import {PrDoc, PrDocScene, SceneObj} from './document';
import {Serializer} from 'serialize/serializer';
import {Queue} from 'common/promise';

export class PrDocModel {
  private sr: Serializer;
  private doc: PrDoc;

  static make(doc: PrDoc, sr: Serializer): PrDocModel {
    let model = new PrDocModel();
    model.doc = doc;
    model.sr = sr;
    return model;
  }

  appendFrame(): Promise<PrDocScene> {
    const frames = this.doc.getFrames();
    return Queue.lastResult(
      () => this.sr.makeObject(PrDocScene.getDesc().classId),
      (frame: PrDocScene) => frames.append(frame, frames.getLength()),
      () => frames.get(frames.getLength() - 1)
    );
  }

  appendObj(x: number, y: number, frame: PrDocScene, parent?: SceneObj): Promise<SceneObj> {
    const objs = parent ? parent.getChildren() : frame.getObjects();
    return Queue.lastResult(
      () => this.sr.makeObject(SceneObj.getDesc().classId, [x, y]),
      (obj: SceneObj) => objs.append(obj, objs.getLength()),
      () => objs.get(objs.getLength() - 1)
    );
  }

  getDoc() {
    return this.doc;
  }
}