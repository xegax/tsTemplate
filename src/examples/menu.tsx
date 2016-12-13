import {getContainer} from 'examples-main/helpers';
import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {Menu, MenuItem, Separator} from 'controls/menu';

function onShowMenu1(e) {
  let items: Array<MenuItem> = [
    {label: 'item 1', icon: 'fa fa-files-o'},
    {label: 'item 2', icon: 'fa fa-font'},
    Separator,
    {label: 'submenu xx yy zz cc yy uu', icon: 'fa fa-apple', submenu: [
      {label: 'sub 1'},
      {label: 'sub 2'},
      {label: 'sub 3', submenu: [
        {label: 'sub 12'},
        {label: 'sub 22'},
        {label: 'sub 32'}
    ]}
    ]},
    {label: 'item 3'},
    {label: 'item 4'}
  ];
  Menu.showUnder(e.target, <Menu items={items}/>);
}

function onShowMenu2(e) {
  let items: Array<MenuItem> = [
    {label: 'item 1'},
    {label: 'item 2'},
    Separator,
    {label: 'item 3'},
    {label: 'item 4'},
    Separator
  ];
  Menu.showUnder(e.target, <Menu items={items}/>);
  e.preventDefault();
}

ReactDOM.render((
  <div style={{flexGrow: 1}}>
    <button onClick={onShowMenu1}>menu 1</button>
    <a href='#' onContextMenu={onShowMenu2}>menu 2</a>
    <div style={{textAlign: 'right'}}><button onClick={onShowMenu1}>menu 1</button></div>
  </div>
), getContainer());