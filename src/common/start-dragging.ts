import {isLeftDown} from 'common/event-helpers';
import {Point} from 'common/point';

interface Params {
  x: number;
  y: number;
  minDist?: number;
  touch?: boolean;
}

interface HandlerArgs {
  x: number;
  y: number;
  event: MouseEvent | TouchEvent;
}

export interface DragHandler {
  onDragStart?(event: HandlerArgs);
  onDragging?(event: HandlerArgs);
  onDragEnd?(event: HandlerArgs);
}

function getPagePoint(event: MouseEvent | TouchEvent): Point {
  const mouseEvent = event as MouseEvent;
  const touchEvent = event as TouchEvent;
  if (touchEvent.touches) {
    const evt = touchEvent.touches[0];
    return {x: evt.pageX, y: evt.pageY};
  }
  return {x: mouseEvent.pageX, y: mouseEvent.pageY};
}

export function startDragging(args: Params, handler: DragHandler) {
  let onDragHandler = (event: MouseEvent | TouchEvent) => {
    let {x, y, minDist} = args;
    if (minDist === undefined)
      minDist = 0;

    let dragValues = { x, y };
    let started = false;
    let clickPoint = getPagePoint(event);

    let onMouseMove = (event: MouseEvent | TouchEvent) => {
      const pagePoint = getPagePoint(event);
      let xOffs = pagePoint.x - clickPoint.x;
      let yOffs = pagePoint.y - clickPoint.y;
      
      if (!started && (minDist == 0 || Math.sqrt(xOffs * xOffs + yOffs * yOffs) > minDist)) {
        started = true;
        handler.onDragStart && handler.onDragStart({x: dragValues.x, y: dragValues.y, event});
      }

      dragValues.x = xOffs + x;
      dragValues.y = yOffs + y;

      if (started) {
        if (!args.touch)
          event.preventDefault();
        handler.onDragging && handler.onDragging({x: dragValues.x, y: dragValues.y, event});
      }
    };

    let onMouseUp = (event: MouseEvent) => {
      if (args.touch) {
        window.removeEventListener('touchmove', onMouseMove);
        window.removeEventListener('touchend', onMouseUp);
      } else {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      
      if (!started)
        return;

      handler.onDragEnd && handler.onDragEnd({x: dragValues.x, y: dragValues.y, event});
      if (!args.touch)
        event.preventDefault();
    };

    if (minDist == 0)
      onMouseMove(event);

    if (args.touch) {
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    } else {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    
    if (!args.touch)
      event.preventDefault();
    event.stopPropagation();
  };

  return (e: MouseEvent | TouchEvent) => {
    if (args.touch || isLeftDown(e as MouseEvent))
      onDragHandler(e);
  };
}
