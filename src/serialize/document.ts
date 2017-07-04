import {ObjID, ObjDesc} from './object-factory';
import {ListObj} from './list-obj';
import {ObjectFactory} from './object-factory';

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
  private list = new ListObj<DocBase>();

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

export function register(factory: ObjectFactory) {
  factory.register(DocList);
  factory.register(DocText);
  factory.register(DocImage);
  factory.register(ListObj);
  factory.register(TextRow);
  factory.register(DocBase);
}