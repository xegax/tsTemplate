export function isLeftDown(event: MouseEvent) {
  var evt: any = event;

  if (evt.button !== undefined)
    return evt.button === 0;

  return evt.buttons === 1;
}


interface Params {
  x: number;
  y: number;
  minDist?: number;
}

interface HandlerArgs {
  x: number;
  y: number;
  event: MouseEvent;
}

export interface DragHandler {
  onDragStart?(event: HandlerArgs);
  onDragging?(event: HandlerArgs);
  onDragEnd?(event: HandlerArgs);
}

export function startDragging(args: Params, handler: DragHandler) {
  let onDragHandler = (event: MouseEvent) => {
    let {x, y, minDist} = args;
    if (minDist === undefined)
      minDist = 0;

    let dragValues = { x, y };
    let started = false;
    let clickPoint = { x: event.pageX, y: event.pageY };
    
    let onMouseMove = (event: MouseEvent) => {
      let xOffs = event.pageX - clickPoint.x;
      let yOffs = event.pageY - clickPoint.y;

      if (!started && Math.sqrt(xOffs * xOffs + yOffs * yOffs) > minDist) {
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (!started)
        return;

      handler.onDragEnd && handler.onDragEnd({x: dragValues.x, y: dragValues.y, event});
      event.preventDefault();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
  };

  return (e: MouseEvent) => {
    if (isLeftDown(e))
      onDragHandler(e);
  };
}