class IDCounter {
  private counter: number = 0;

  constructor(counterStart: number) {
    this.counter = counterStart;
  }

  getCounter(): number {
    return this.counter;
  }

  getNextId(): number {
    return this.counter++;
  }
}

export class ObjWithID {
  private id: string;

  constructor(id: string) {
    this.id = id;
  }

  getId(): string {
    return this.id;
  }
}

let idCounter = new IDCounter(0);
export class Document extends ObjWithID {
  static readonly classType = {
    name: 'Document'
  };
  private store: {
    name: string,
    version: number,
    idCounter: IDCounter
  };

  load() {
  }

  constructor() {
    super('');

    this.store.idCounter = new IDCounter(0);
    this.store.name = '';
    this.store.version = 0;
  }
}


function saveTo(doc: Document) {
  const simpleType = ['string', 'number'];
  const store = doc['store'];
  Object.keys(store).map(key => {
  });
}