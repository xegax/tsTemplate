import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {PopupContext, Popup} from 'controls/popup';
import {getContainer} from 'examples-main/helpers';

let rects = [
  [100, 100, 'red'],
  [100, 300, 'red'],
  [300, 100, 'green'],
  [300, 300, 'green']
];

function tooltip(text: string) {
  return <div style={{padding: 4, backgroundColor: 'white', border: '1px solid black'}}>{text}</div>;
}

ReactDOM.render((
  <div>
    {rects.map((rect, i) => {
      let style = {
        display: 'inline-block',
        position: 'absolute',
        left: rect[0],
        top: rect[1],
        width: 50,
        height: 50,
        backgroundColor: rect[2]
      };
      return (
        <div
          key={i}
          style={style}
          onContextMenu={event => {
            PopupContext.get().show({x: event.pageX, y: event.pageY}, tooltip('id: ' + i + ', ' + rect[2]));
          }}
        />
      )
    })}
  </div>
), getContainer());

getContainer().addEventListener('contextmenu', event => {
  event.preventDefault();
  PopupContext.get().show({x: event.clientX, y: event.clientY}, tooltip('background')); 
});