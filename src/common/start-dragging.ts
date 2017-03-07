import {isLeftDown} from 'common/event-helpers';
import {Point} from 'common/point';

interface Params {
  x: number;
  y: number;
  minDist?: number;
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

let touchDevice = navigator.appVersion.toLocaleLowerCase().indexOf('mobile') != -1;
let tgtElement: HTMLElement = null;
export function startDragging(args: Params, handler: DragHandler) {
  let touch = false;
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
        event.preventDefault();
        handler.onDragging && handler.onDragging({x: dragValues.x, y: dragValues.y, event});
      }
    };

    let onMouseUp = (event: MouseEvent) => {
      if (touch) {
        tgtElement.removeEventListener('touchmove', onMouseMove);
        tgtElement.removeEventListener('touchend', onMouseUp);
      } else {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
      tgtElement = null;
      
      if (!started)
        return;

      handler.onDragEnd && handler.onDragEnd({x: dragValues.x, y: dragValues.y, event});
      if (!touch)
        event.preventDefault();
    };

    if (minDist == 0)
      onMouseMove(event);

    if (touch) {
      tgtElement.addEventListener('touchmove', onMouseMove);
      tgtElement.addEventListener('touchend', onMouseUp);
    } else {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    
    event.preventDefault();
    event.stopPropagation();
  };

  return (e: MouseEvent | TouchEvent) => {
    if (touchDevice && e.type == 'mousedown')
      return false;

    if (tgtElement)
      return false;

    tgtElement = e.target as HTMLElement;
    touch = (e as TouchEvent).touches && (e as TouchEvent).touches.length > 0;
    if (touch || isLeftDown(e as MouseEvent))
      onDragHandler(e);
    return true;
  };
}
