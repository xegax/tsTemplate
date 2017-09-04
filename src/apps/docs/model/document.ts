import {ObjectFactory, ObjID, ObjDesc} from 'serialize/object-factory';
import {ListObj} from 'serialize/list-obj';
import {clamp} from 'common/common';

export {
  ListObj,
  ObjID
}

export class FileObj extends ObjID {
  private name: string = '';
  private size: number = 0;
  private type: string = '';
  private descr: string = '';

  private constructor(args?: {name: string, size: number, type: string, descr: string}) {
    super();
    if (args) {
      this.name = args.name || this.name;
      this.size = args.size || this.size;
      this.type = args.type || this.type;
      this.descr = args.descr || this.descr;
    }
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'FileObj',
      objects: {
        name: 'string',
        type: 'string',
        size: 'integer',
        descr: 'string'
      },
      make: (args) => new FileObj(args)
    };
  }

  getSize() {
    return this.size;
  }

  getName() {
    return this.name;
  }

  getType() {
    return this.type;
  }

  getDescr() {
    return this.descr;
  }

  setDescr(text: string) {
    if (this.descr == text)
      return;

    this.descr = text;
    this.modified();
  }
}

export class ServerSideData extends ObjID {
  private files = new ListObj<FileObj>();

  static getDesc(): ObjDesc {
    return {
      classId: 'ServerSideData',
      objects: {
        files: 'ListObj'
      },
      make: () => new ServerSideData()
    }
  }

  getFiles() {
    return this.files;
  }
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
  private frames = new ListObj<PrDocScene>();
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

export class SceneObj extends ObjID {
  private x: number = 0;
  private y: number = 0;
  private width: number = 100;
  private height: number= 50;
  private offs = {x: 0, y: 0};
  private children = new ListObj<SceneObj>();

  static getDesc(): ObjDesc {
    return {
      classId: 'SceneObj',
      objects: {
        x: 'number',
        y: 'number',
        width: 'number',
        height: 'number',
        children: 'ListObj'
      },
      make: (x: number,  y: number) => {
        let obj = new SceneObj();
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

  getChildren() {
    return this.children;
  }
}

export class SceneObjHolder extends ObjID {
  private obj: SceneObj;
  private locX: number = 0;
  private locY: number = 0;
  private durationMSec: number = 1000;
  private timeMSec: number = 0;

  private constructor(obj: SceneObj) {
    super();
    this.obj = obj;
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'SceneObjHolder',
      objects: {
        durationMSec: 'number',
        locX: 'number',
        locY: 'number'
      },
      make: (obj?: SceneObj) => new SceneObjHolder(obj)
    };
  }

  setTime(newTime: number) {
    let timeMSec = newTime % this.durationMSec;
    if (timeMSec == this.timeMSec)
      return;
    
    this.timeMSec = timeMSec;
  }
}

export class PrDocScene extends ObjID {
  private objects = new ListObj<SceneObj>();
  private durationMSec: number = 10000;
  private timeMSec: number = 0;

  static getDesc(): ObjDesc {
    return {
      classId: 'PrDocScene',
      objects: {
        objects: 'ListObj'
      },
      make: () => new PrDocScene()
    };
  }

  getObjects() {
    return this.objects;
  }

  getObj(n: number) {
    return this.objects.get(n);
  }
}

export class CharImage extends ObjID {
  private url: string = '';

  static getDesc(): ObjDesc {
    return {
      classId: 'CharImage',
      objects: {
        url: 'string'
      },
      make: () => new CharImage()
    };
  }
}

export class Character extends ObjID {
  private name: string = '';
  private desc: string = '';
  private images = new ListObj<CharImage>();

  constructor(args?: {name: string, descr: string}) {
    super();

    if (args && args.name)
      this.name = args.name;

    if (args && args.descr)
      this.desc = args.descr || '';
  }

  static getDesc(): ObjDesc {
    return {
      classId: 'Character',
      objects: {
        name: 'string',
        desc: 'string',
        images: 'ListObj'
      },
      make: (args) => new Character(args)
    };
  }

  getName() {
    return this.name;
  }

  setName(name: string) {
    if (name == this.name)
      return;

    this.name = name;
    this.modified();
  }

  getDescr() {
    return this.desc || '';
  }

  setDescr(descr: string) {
    if (this.desc == descr)
      return;

    this.desc = descr;
    this.modified();
  }
}

export class CharacterTable extends ObjID {
  private chars = new ListObj<Character>();
  private layout: string = '';

  static getDesc(): ObjDesc {
    return {
      classId: 'CharacterTable',
      objects: {
        chars: 'ListObj',
        layout: 'string'
      },
      make: () => new CharacterTable()
    };
  }

  getList() {
    return this.chars;
  }

  setLayout(layout: string) {
    if (layout == this.layout)
      return;
    this.layout = layout;
    this.modified();
  }

  getLayout() {
    return this.layout;
  }
}

export function register(factory: ObjectFactory) {
  factory.register(ServerSideData);
  factory.register(FileObj);

  factory.register(Character);
  factory.register(CharacterTable);
  factory.register(CharImage);

  factory.register(PrDoc);
  factory.register(PrDocScene);
  factory.register(SceneObj);
  factory.register(DocList);
  factory.register(DocText);
  factory.register(DocImage);
  factory.register(ListObj);
  factory.register(TextRow);
  factory.register(DocBase);
  factory.register(DocDesc);
}