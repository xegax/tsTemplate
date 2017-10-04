import {Size, Point} from 'common/point';
import {Rect} from 'common/rect';
import {Publisher} from 'common/publisher';

export abstract class CanvasViewModel {
  static Events = {
    update:     1,
    viewPoint:  2
  };

  private contentSize: Size = {width: 0, height: 0};
  private canvasSize: Size = {width: 0, height: 0};
  private viewPoint: Point = {x: 0, y: 0};
  private publisher = new Publisher();

  constructor(contentSize?: Size) {
    contentSize = contentSize || {width: 0, height: 0};
    this.contentSize.width = contentSize.width;
    this.contentSize.height = contentSize.height;
  }

  getPublisher() {
    return this.publisher;
  }

  getContentSize(): Size {
    return {...this.contentSize};
  }
  
  setViewPoint(x: number, y: number, force: boolean = false) {
    if (x == this.viewPoint.x && y == this.viewPoint.y)
      return;

    this.viewPoint.x = x;
    this.viewPoint.y = y;
    this.publisher.updateVersion(CanvasViewModel.Events.viewPoint, 1);
  }

  getViewPoint() {
    return {...this.viewPoint};
  }

  setCanvasSize(width: number, height: number) {
    this.canvasSize.width = width;
    this.canvasSize.height = height;
  }

  getCanvasSize() {
    return {...this.canvasSize};
  }

  update(now: boolean = false) {
    this.publisher.updateVersion(CanvasViewModel.Events.update, now ? 0 : 1);
  }

  onRender(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    ctx.setTransform(1, 0, 0, 1, 0.5 - this.viewPoint.x, 0.5 - this.viewPoint.y);
    this.onRenderImpl(ctx);

    ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);
    this.onOverlayImpl(ctx);

    ctx.restore();
  }

  abstract onRenderImpl(ctx: CanvasRenderingContext2D);
  onOverlayImpl(ctx: CanvasRenderingContext2D) {};
}