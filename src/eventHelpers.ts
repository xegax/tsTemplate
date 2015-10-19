import React = require('react');

export enum MouseButtons {
  Left = 1,
  Middle = 2,
  Right = 3
}

export function isMouseDown(event: React.MouseEvent, button: MouseButtons) {
  var evt: any = event;

  if (evt.button !== undefined)
    return evt.button === button - 1;

  return evt.buttons === button;
}

// нужно вызывать в обработчике mouseDown собятия для предотвращения появления контекстного меню
export function preventContextMenu() {
  var defaultCtxMenu = (event: MouseEvent) => {
    event.preventDefault();
    window.removeEventListener('contextmenu', defaultCtxMenu);
  };

  window.addEventListener('contextmenu', defaultCtxMenu);
}

export interface DragHandler {
  onMoving?: (val: number) => void;
  onMoved?: (val: number) => void;
  onRightDown?: (event: React.MouseEvent) => void;
  onCaught?: (event: React.MouseEvent) => void;
};

export function dragHandler(dragVal: number, handler: DragHandler, axis: number = 0) {
  var onDrag = (event: React.MouseEvent) => {
    var pt = { x: event.pageX, y: event.pageY };
    var mouseMove = (event: MouseEvent) => {
      var offs = [event.pageX - pt.x, event.pageY - pt.y];
      if (handler.onMoving)
        handler.onMoving(offs[axis] + dragVal);
    };

    var mouseUp = (event: MouseEvent) => {
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);

      var offs = [event.pageX - pt.x, event.pageY - pt.y];
      if (handler.onMoved)
        handler.onMoved(offs[axis] + dragVal);
    };

    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp);

    if (handler.onCaught)
      handler.onCaught(event);
  };

  return (event: React.MouseEvent) => {
    if (isMouseDown(event, MouseButtons.Left)) {
      onDrag(event);
    } else if (isMouseDown(event, MouseButtons.Right) && handler.onRightDown) {
      handler.onRightDown(event);
    }
  };
}
