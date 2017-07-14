import {ObjectFactory, ObjID, ObjDesc} from '../../serialize/object-factory';
import {ListObj} from '../../serialize/list-obj';

export {
  ListObj
}

export class DocDesc extends ObjID {
  private name: string = 'noname';
  private desc: string = '';
  private docId: string = '';
  private type: string = '';

  private constructor(docId: string, type: string) {
    super();
    this.docId = docId;
    this.type = type;
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'DocDesc',
      objects: {
        name: 'string',
        desc: 'string',
        docId: 'string'
      },
      make: (docId: string, type: string) => new DocDesc(docId, type)
    };
  }

  setName(name: string) {
    if (this.name == name)
      return;

    this.name = name;
    this.modified();
  }

  getName() {
    return this.name;
  }

  setDescr(text: string) {
    if (this.desc == text)
      return;
    this.desc = text;
    this.modified();
  }

  getDescr() {
    return this.desc;
  }

  getDocId() {
    return this.docId;
  }

  getType() {
    return this.type;
  }
}

export class DocBase extends ObjID {
  private name: string = 'noname';
  private desc: string = '';

  static getDesc(): ObjDesc {
    return {
      classId: 'DocBase',
      objects: {
        'name': 'string',
        'desc': 'string'
      },
      make: () => new DocBase()
    };
  }

  setName(name: string) {
    if (this.name == name)
      return;

    this.name = name;
    this.modified();
  }

  getName() {
    return this.name;
  }

  setDescr(text: string) {
    if (this.desc == text)
      return;
    this.desc = text;
    this.modified();
  }

  getDescr() {
    return this.desc;
  }
}

export class TextRow extends ObjID {
  private text: string = '';

  constructor(text?: string) {
    super();
    this.text = text || this.text;
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'TextRow',
      objects: {
        'text': 'string'
      },
      make: (text: string) => new TextRow(text)
    };
  }
}

export class DocText extends DocBase {
  private rows = new ListObj<TextRow>();

  static getDesc(): ObjDesc {
    return {
      classId: 'DocText',
      objects: {
        ...DocBase.getDesc().objects,
        'rows': 'ListObj'
      },
      make: () => new DocText() 
    };
  }

  getRows(): ListObj<TextRow> {
    return this.rows;
  }
}

export class DocImage extends DocBase {
  private imgLink: string = 'psx-logo-small.png';

  constructor(imgLink?: string) {
    super();
    this.imgLink = imgLink || this.imgLink;
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'DocImage',
      objects: {
        ...super.getDesc().objects,
        'imgLink': 'string'
      },
      make: () => new DocImage()
    };
  }
}

export class DocList extends ObjID {
  private list = new ListObj<DocDesc>();

  static getDesc(): ObjDesc {
    return {
      classId: 'DocList',
      objects: {
        'list': 'ListObj'
      },
      make: () => new DocList()
    };
  }

  getList() {
    return this.list;
  }
}

export class PrDoc extends DocBase {
  private frames = new ListObj<PrDocFrame>();
  private width: number = 600;
  private height: number = 500;

  static getDesc(): ObjDesc {
    return {
      classId: 'PrDoc',
      objects: {
        ...super.getDesc().objects,
        frames: 'ListObj',
        width: 'integer',
        height: 'integer'
      },
      make: () => new PrDoc()
    };
  }

  getSize() {
    return {
      width: this.width,
      height: this.height
    };
  }

  setWidth(size: number) {
    if (this.width == size)
      return;
    this.getImpl().modified();
  }

  setHeight(size: number) {
    if (this.height == size)
      return;
    this.getImpl().modified();
  }

  getFrames() {
    return this.frames;
  }
}

export class FrameObj extends ObjID {
  private x: number = 0;
  private y: number = 0;
  private width: number = 100;
  private height: number= 50;
  private offs = {x: 0, y: 0};

  static getDesc(): ObjDesc {
    return {
      classId: 'FrameObj',
      objects: {
        x: 'number',
        y: 'number',
        width: 'number',
        height: 'number'
      },
      make: (x: number,  y: number) => {
        let obj = new FrameObj();
        if (x != null)
            obj.x = x;

        if (y != null)
            obj.y = y;
        return obj;
      }
    };
  }

  getRect() {
    return {
      x: this.x + this.offs.x,
      y: this.y + this.offs.y,
      width: this.width,
      height: this.height
    };
  }

  setPos(x: number, y: number) {
    if (this.x == x && this.y == y)
        return;

    this.x = x;
    this.y = y;
    this.modified();
  }

  setOffs(x: number, y: number) {
    this.offs.x = x;
    this.offs.y = y;
  }
}

export class PrDocFrame extends ObjID {
  private objects = new ListObj<FrameObj>();

  static getDesc(): ObjDesc {
    return {
      classId: 'PrDocFrame',
      objects: {
        objects: 'ListObj'
      },
      make: () => new PrDocFrame()
    };
  }

  getObjects() {
    return this.objects;
  }
}


export function register(factory: ObjectFactory) {
  factory.register(PrDoc);
  factory.register(PrDocFrame);
  factory.register(FrameObj);
  factory.register(DocList);
  factory.register(DocText);
  factory.register(DocImage);
  factory.register(ListObj);
  factory.register(TextRow);
  factory.register(DocBase);
  factory.register(DocDesc);
}