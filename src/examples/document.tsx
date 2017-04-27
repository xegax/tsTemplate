import {TableData} from 'table/table-data';

interface Document {
  id: string;

  getTable(name: string): Promise<TableData>;
}

interface Frame {
  objects: Array<Object>;
}
// каждая таблица бд это возможный тип объекта + id документа
// Frame {name: string; time: number; id: string} => таблица (name text, time int, id int) + (docId: int)
// Shape {name: string; }

function getFrames(doc: Document) {
  doc.getTable('frames').then(data => {
  });
}