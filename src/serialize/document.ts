import {ObjID, ObjDesc} from './object-factory';
import {ListObj} from './list-obj';

export class DocText extends ObjID {
  private name: string = 'undefined';
  private descr: string = '';

  static getDesc(): ObjDesc {
    return {
      classId: 'DocText',
      objects: {
        'name': 'string',
        'descr': 'string'
      },
      make: () => new DocText() 
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
    if (this.descr == text)
      return;
    this.descr = text;
    this.modified();
  }

  getDescr() {
    return this.descr;
  }
}

export class DocList extends ObjID {
  private list = new ListObj<DocText>();

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