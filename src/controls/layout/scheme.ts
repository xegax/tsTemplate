import {assign} from 'lodash';

export type Scheme = Item | Children;

export interface Item {
  type: 'item';
  label?: string;
  uid: string;
  grow?: number;
  title?: boolean;
  show?: boolean;
}

export interface Children {
  uid?: string;
  type: 'column' | 'row';
  title?: boolean;
  children?: Array<Item | Children>;
  grow?: number;
  show?: boolean;
}

interface Getter {
  get(): Children;
  grow(value: number): Getter;
  title(show?: boolean): Getter;
  show(show: boolean): Getter;
}

export function column(...children: Array<Item | Children | Getter>): Getter {
  const item: Children = {
    type: 'column',
    children: children.map(child => child['get'] != null ? child['get']() : child),
    grow: 1,
    title: false,
    show: true
  };

  const res: Getter = {
    get: () => item,
    grow: (value: number) => {
      item.grow = value;
      return res;
    },
    title: (show: boolean) => {
      item.title = show == null ? true : show;
      return res;
    },
    show: (show: boolean) => {
      item.show = show;
      return res;
    }
  };

  return res;
}

export function row(...children: Array<Item | Children | Getter>): Getter {
  const item: Children = {
    type: 'row',
    children: children.map(child => child['get'] != null ? child['get']() : child),
    grow: 1,
    title: false,
    show: true
  };

  const res: Getter = {
    get: () => item,
    grow: (value: number) => {
      item.grow = value;
      return res;
    },
    title: (show: boolean) => {
      item.title = show == null ? true : show;
      return res;
    },
    show: (show: boolean) => {
      item.show = show;
      return res;
    }
  };

  return res;
}

export function find(uid: string, colOrRow: Children): Item {
  for (let n = 0; n < colOrRow.children.length; n++) {
    if (colOrRow.children[n].uid == uid)
      return colOrRow.children[n] as Item;
    
    if (colOrRow.children[n].type == 'item')
      continue;
      
    const item = find(uid, colOrRow.children[n] as Children);
    if (item)
      return item;
  }
}

export function item(uid: string, grow?: number, show?: boolean): Item {
  const res: Item =  {
    type: 'item',
    uid,
    grow: 1,
    title: false,
    show: show == null ? true : show
  };

  if (grow != null)
    res.grow = grow;
  return res;
}

export function titleItem(id: string, grow?: number): Item {
  var res = item(id, grow);
  res.title = true;
  return res;
}