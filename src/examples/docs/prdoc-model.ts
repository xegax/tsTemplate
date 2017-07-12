import {PrDoc, PrDocFrame, FrameObj} from './document';
import {Serializer} from '../../serialize/serializer';
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

  appendFrame(): Promise<PrDocFrame> {
    const frames = this.doc.getFrames();
    return Queue.lastResult(
      () => this.sr.makeObject(PrDocFrame.getDesc().classId),
      (frame: PrDocFrame) => frames.append(frame, frames.getLength()),
      () => frames.get(frames.getLength() - 1)
    );
  }

  appendObj(x: number, y: number, frame: PrDocFrame): Promise<FrameObj> {
    const objs = frame.getObjects();
    return Queue.lastResult(
      () => this.sr.makeObject(FrameObj.getDesc().classId, [x, y]),
      (obj: FrameObj) => objs.append(obj, objs.getLength()),
      () => objs.get(objs.getLength() - 1)
    );
  }

  getDoc() {
    return this.doc;
  }
}