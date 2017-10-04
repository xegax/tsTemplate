import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {CanvasView, CanvasViewModel} from 'controls/canvas/canvas-view';
import {Rect, Point} from 'common/rect';

class Model extends CanvasViewModel {
  private cursor: Point = {x: 0, y: 0};

  onOverlayImpl(ctx: CanvasRenderingContext2D) {
    const size = this.getCanvasSize();
    const view = this.getViewPoint();

    ctx.strokeRect(0, 0, size.width - 1, size.height - 1);
    ctx.fillText(`canvas size: ${size.width}, ${size.height}`, 10, 10);
    ctx.fillText(`view: ${view.x}, ${view.y}`, 10, 30);
  }

  onRenderImpl(ctx: CanvasRenderingContext2D) {
    const cursor = this.cursor;
    ctx.beginPath();
    ctx.moveTo(cursor.x - 5, cursor.y);
    ctx.lineTo(cursor.x + 5, cursor.y);
    ctx.moveTo(cursor.x, cursor.y - 5);
    ctx.lineTo(cursor.x, cursor.y + 5);
    ctx.stroke();
    ctx.closePath();
  }

  setCursor(point: Point) {
    this.cursor.x = point.x;
    this.cursor.y = point.y;

    return this;
  }
}

const model = new Model({width: 1000, height: 1000});
ReactDOM.render(
  <FitToParent>
      <CanvasView
        model={model}
        onMouseMove={pos => model.setCursor(pos).update()}
      />
  </FitToParent>, getContainer()
);