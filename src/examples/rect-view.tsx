import {Rect, BoundRect, getRect} from 'common/rect';
import {Point} from 'common/point';
import {assign, isEqual} from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {clamp} from 'common/common';
import {startDragging} from 'common/start-dragging';
import {Timer} from 'common/timer';
// 1. viewRect меньше (внутри) dataRect - появляются скроллбары
// 2. viewRect больше dataRect - dataRect центрируется внутри viewRect

// конечная левая верхняя точка будет расчитана как data * scale - leftTop
// конечная правая нижняя точка будет расчитана как data * scale + rightBottom
export interface DataPoint {
  data: Point;
  leftTop?: Point; // не масштабируемые левые верхние границы относительно data
  rightBottom?: Point;  // не масштабируемые правые нижние границы относительно data
}

// конечная точка будет расчитана как point * scale + bounds
interface BoundPoint {
  point: Point;   // масштабируемая точка
  bounds: Point;  // не масштабируемые границы точки
}

export class RectView {
  private fitToSize = true;
  private scale: number = 1;
  private scaledDataRect: BoundRect = {
    left: 0, top: 0,
    right: 0, bottom: 0
  }; // область данных, с учётом масштаба
  private padding: number = 10;

  // крайние точки данных
  private leftTopData: BoundPoint = {point: {x: 0, y: 0}, bounds: {x: 0, y: 0}};
  private rightBottomData: BoundPoint = {point: {x: 0, y: 0}, bounds: {x: 0, y: 0}};

  private viewRect: Rect = getRect(); // область видимости

  setViewRect(rect: Rect) {
    if (isEqual(rect, this.viewRect))
      return;

    this.viewRect = assign({}, rect);
    
    this.updateScale();
    this.updateDataRect();
    this.updateViewRect();
  }

  getViewRect() {
    return assign({}, this.viewRect);
  }

  setDataRect(rect: Rect, bounds?: BoundRect) {
    this.leftTopData = {
      point: {x: rect.x, y: rect.y},
      bounds: bounds ? { x: rect.x - bounds.left, y: rect.y - bounds.top } : {x: 0, y: 0}
    };

    this.rightBottomData = {
      point: {x: rect.x + rect.width, y: rect.y + rect.height},
      bounds: bounds ? { x: rect.x + rect.width + bounds.right, y: rect.y + rect.height + bounds.bottom } : {x: 0, y: 0}
    };
    this.updateScale();
    this.updateDataRect();
    this.updateViewRect();
  }

  setDataPoints(points: Array<DataPoint>) {
    if (points.length) {
      const point = points[0].data;
      const leftTop = points[0].leftTop || {x: 0, y: 0};
      const rightBottom = points[0].rightBottom || {x: 0, y: 0};

      this.leftTopData = {
        point: {x: point.x, y: point.y},
        bounds: {x: Math.abs(leftTop.x), y: Math.abs(leftTop.y)}
      };

      this.rightBottomData = {
        point: {x: point.x, y: point.y},
        bounds: {x: Math.abs(rightBottom.x), y: Math.abs(rightBottom.y)}
      };
    } else {
      this.leftTopData = {point: {x: 0, y: 0}, bounds: {x: 0, y: 0}};
      this.rightBottomData = {point: {x: 0, y: 0}, bounds: {x: 0, y: 0}};
    }

    points.forEach(point => {
      const leftTop = point.leftTop || {x: 0, y: 0};
      const rightBottom = point.rightBottom || {x: 0, y: 0};

      this.leftTopData.point.x = Math.min(this.leftTopData.point.x, point.data.x);
      this.leftTopData.point.y = Math.min(this.leftTopData.point.y, point.data.y);
      this.rightBottomData.point.x = Math.max(this.rightBottomData.point.x, point.data.x);
      this.rightBottomData.point.y = Math.max(this.rightBottomData.point.y, point.data.y);

      this.leftTopData.bounds.x = Math.max(this.leftTopData.bounds.x, Math.abs(leftTop.x));
      this.leftTopData.bounds.y = Math.max(this.leftTopData.bounds.y, Math.abs(leftTop.y));
      this.rightBottomData.bounds.x = Math.max(this.rightBottomData.bounds.x, Math.abs(rightBottom.x));
      this.rightBottomData.bounds.y = Math.max(this.rightBottomData.bounds.y, Math.abs(rightBottom.y));
    });
    //this.leftTopData.bounds.x = this.leftTopData.point.x - this.leftTopData.bounds.x;
    //this.leftTopData.bounds.y = this.leftTopData.point.y - this.leftTopData.bounds.y;
    //this.rightBottomData.bounds.x = this.rightBottomData.bounds.x - this.rightBottomData.point.x;
    //this.rightBottomData.bounds.y = this.rightBottomData.bounds.y - this.rightBottomData.point.y;

    this.updateScale();
    this.updateDataRect();
    this.updateViewRect();
  }

  dataPoint2ViewPoint(dataPoint: Point): Point {
    return {
      x: Math.round((dataPoint.x - this.leftTopData.point.x) * this.scale + this.leftTopData.bounds.x - this.viewRect.x + this.padding),
      y: Math.round((dataPoint.y - this.leftTopData.point.y) * this.scale + this.leftTopData.bounds.y - this.viewRect.y + this.padding)
    };
  }

  viewPoint2DataPoint(viewPoint: Point): Point {
    return {
      x: (viewPoint.x - this.leftTopData.bounds.x + this.viewRect.x - this.padding) / this.scale + this.leftTopData.point.x,
      y: (viewPoint.y - this.leftTopData.bounds.y + this.viewRect.y - this.padding) / this.scale + this.leftTopData.point.y
    };
  }

  getDataSize() {
    return {
      width: (this.scaledDataRect.right - this.scaledDataRect.left),
      height: (this.scaledDataRect.bottom - this.scaledDataRect.top)
    };
  }

  getLeftTop(): BoundPoint {
    return {
      point: {x: this.leftTopData.point.x, y: this.leftTopData.point.y},
      bounds: {x: this.leftTopData.bounds.x + this.padding, y: this.leftTopData.bounds.y + this.padding}
    };
  }

  setScale(scale: number, centerDataPoint?: Point) {
    const pt1 = this.dataPoint2ViewPoint(centerDataPoint);
    this.scale = clamp(scale, [0.01, 10]) || this.scale;
    const pt2 = this.dataPoint2ViewPoint(centerDataPoint);
    this.viewRect.x += pt2.x - pt1.x;
    this.viewRect.y += pt2.y - pt1.y;

    this.fitToSize = false;
    this.updateDataRect();
    this.updateViewRect();
  }

  getScale() {
    return this.scale;
  }

  private centralize() {
    const dataSize = this.getDataSize();
    if (dataSize.width <= this.viewRect.width)
      this.viewRect.x = -Math.round((this.viewRect.width - dataSize.width) / 2);
    
    if (dataSize.height <= this.viewRect.height)
      this.viewRect.y = -Math.round((this.viewRect.height - dataSize.height) / 2);
  }

  private updateViewRect() {
    this.centralize();
  }

  private getScaledDataRect(scale: number) {
    const width = (this.rightBottomData.point.x - this.leftTopData.point.x) * scale;
    const height = (this.rightBottomData.point.y - this.leftTopData.point.y) * scale;
    
    return {
      left: Math.round(this.leftTopData.point.x - this.leftTopData.bounds.x - this.padding),
      top: Math.round(this.leftTopData.point.y - this.leftTopData.bounds.y - this.padding),
      right: Math.round(this.leftTopData.point.x + width + this.rightBottomData.bounds.x + this.padding),
      bottom: Math.round(this.leftTopData.point.y + height + this.rightBottomData.bounds.y + this.padding)
    };
  }

  private updateDataRect() {
    this.scaledDataRect = this.getScaledDataRect(this.scale);
  }

  private updateScale() {
    if (!this.fitToSize)
      return;

    const boundX = this.rightBottomData.bounds.x + this.leftTopData.bounds.x + this.padding * 2;
    const boundY = this.rightBottomData.bounds.y + this.leftTopData.bounds.y + this.padding * 2;
    this.scale = Math.min(
      (this.viewRect.width - boundX) / ((this.rightBottomData.point.x - this.leftTopData.point.x) || 1),
      (this.viewRect.height - boundY) / ((this.rightBottomData.point.y - this.leftTopData.point.y) || 1)
    );
  }
}

interface Item extends Point {
  size: number;
}

interface Props {
  width?: number;
  height?: number;
  points: Array<Item>;
}

interface State {
  canvasWidth?: number;
  canvasHeight?: number;
  dataWidth?: number;
  dataHeight?: number;
  model?: RectView;
}

class View extends React.Component<Props, State> {
  private hoverPoint: number = -1;
  private dragging = false;

  constructor(props: Props) {
    super(props);

    const model = new RectView();
    model.setDataPoints(this.props.points.map(pt => {
      return {
        data: {x: pt.x, y: pt.y },
        leftTop: {x: pt.size / 2, y: pt.size / 2},
        rightBottom: {x: pt.size / 2, y: pt.size / 2}
      };
    }));
    const dataSize = model.getDataSize();

    this.state = {
      canvasWidth: 0,
      canvasHeight: 0,
      dataWidth: dataSize.width,
      dataHeight: dataSize.height,
      model
    };
  }

  componentWillReceiveProps(props: Props) {
    if (props.width == this.props.width && props.height == this.props.height)
      return;

    this.setState({}, this.updateCanvasSize);
  }

  private renderCanvas() {
    const canvas = this.getCanvas();
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    ctx.translate(0.5, 0.5);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'rgba(255, 200, 200, 0.5)';
    ctx.beginPath();
    this.props.points.forEach((pt, i) => {
      const res = this.state.model.dataPoint2ViewPoint(pt);
      const sz = pt.size / 2;
      ctx.moveTo(res.x - sz, res.y);
      ctx.lineTo(res.x + sz, res.y);

      ctx.moveTo(res.x, res.y - sz);
      ctx.lineTo(res.x, res.y + sz);
      
      if (i == this.hoverPoint)
        ctx.fillRect(res.x - sz, res.y - sz, pt.size, pt.size);
      else
        ctx.rect(res.x - sz, res.y - sz, pt.size, pt.size);
    });
    const leftTop = this.state.model.getLeftTop();
    let tmp = this.state.model.dataPoint2ViewPoint({x: leftTop.point.x, y: leftTop.point.y});
    let dataSize = this.state.model.getDataSize();
    ctx.rect(tmp.x - leftTop.bounds.x, tmp.y - leftTop.bounds.y, dataSize.width, dataSize.height);
    ctx.stroke();
    ctx.closePath();
    ctx.restore();
  }

  private updateCanvasSize = () => {
    const scroll = this.getScroll();
    const clientWidth = Math.round(scroll.clientWidth) + 1; 
    const clientHeight = Math.round(scroll.clientHeight) + 1; 
    if (clientWidth == this.state.canvasWidth && clientHeight == this.state.canvasHeight)
      return false;
    
    this.state.model.setViewRect({x: scroll.scrollLeft, y: scroll.scrollTop, width: clientWidth - 2, height: clientHeight - 2});
    this.setState({
      canvasWidth: clientWidth,
      canvasHeight: clientHeight
    }, () => this.renderCanvas());
    return true;
  }

  private onScroll = () => {
    if (this.dragging)
      return;

    const scroll = this.getScroll();
    this.state.model.setViewRect({
      x: scroll.scrollLeft,
      y: scroll.scrollTop,
      width: this.state.canvasWidth - 1,
      height: this.state.canvasHeight - 1
    });
    this.renderCanvas();
  }

  private getScroll(): HTMLDivElement {
    return this.refs['scroll'] as HTMLDivElement;
  }

  private getCanvas(): HTMLCanvasElement {
    return this.refs['canvas'] as HTMLCanvasElement;
  }

  componentDidMount() {
    this.updateCanvasSize();
  }

  onWheel = (event: React.WheelEvent) => {
    const delta = -event.deltaY / Math.abs(event.deltaY);
    this.state.model.setScale(this.state.model.getScale() + delta / 100, this.getPoint(event));
    const scroll = this.getScroll();
    const view = this.state.model.getViewRect();
    scroll.scrollLeft = view.x;
    scroll.scrollTop = view.y;
    const dataSize = this.state.model.getDataSize();

    this.setState({dataWidth: dataSize.width, dataHeight: dataSize.height}, () => {
      if (!this.updateCanvasSize())
        this.renderCanvas();
    });
  }

  getPoint(event) {
    const canvas = this.getCanvas()
    const bbox = canvas.getBoundingClientRect();
    return this.state.model.viewPoint2DataPoint({x: event.pageX - bbox.left, y: event.pageY - bbox.top});
  }

  onMouseMove = (event: React.MouseEvent) => {
    const i = findClosest(this.getPoint(event), 10 / this.state.model.getScale());
    if (i != this.hoverPoint) {
      this.hoverPoint = i;
      this.renderCanvas();
    }
  }

  private startDragging() {
    this.dragging = true;
    this.draggingTimer.stop();
  }

  private draggingTimer: Timer;
  private endDragging() {
    this.draggingTimer = new Timer(() => this.dragging = false).run(500);
  }

  onMouseDown = (event) => {
    if (this.hoverPoint != -1)
      return;
    
    const scroll = this.getScroll();
    const view = this.state.model.getViewRect();
    startDragging({x: 0, y: 0, minDist: 5}, {
      onDragStart: () => this.startDragging(),
      onDragging: (evt) => {
        const newView = assign({}, view, {x: view.x - evt.x, y: view.y - evt.y});
        scroll.scrollLeft = newView.x;
        scroll.scrollTop = newView.y;
        this.state.model.setViewRect(newView);
        this.renderCanvas();
      },
      onDragEnd: () => this.endDragging()
    })(event);
  }

  render() {
    return (
      <div style={{flexGrow: 1, display: 'flex'}}>
        <div ref='scroll' onScroll={this.onScroll} style={{overflow: 'auto', position: 'absolute', backgroundColor: 'silver', width: this.props.width, height: this.props.height}}>
          <div style={{width: this.state.dataWidth, height: this.state.dataHeight}}/>
        </div>
        <canvas
          ref='canvas'
          onWheel={this.onWheel}
          onMouseDown={this.onMouseDown}
          onMouseMove={this.onMouseMove}
          style={{position: 'absolute'}}
          width={this.state.canvasWidth}
          height={this.state.canvasHeight}/>
      </div>
    );
  }
}

const points = [];/*[
  {"x":4897,"y":2532,"size":24},
  {"x":0,"y":100,"size":28},
  {"x":4897,"y":2455,"size":80},
  {"x":3827,"y":0,"size":14}
  ];*/
for (let n = 0; n < 100; n++) {
  let size = 50;//Math.round(10 + Math.random() * 50);
  if (size & 1)
    size++;

  points.push({
    x: Math.round(-5000 + Math.random() * 10000),
    y: Math.round(-5000 + Math.random() * 10000),
    size
  });
}

function findClosest(pt: Point, len: number) {
  for (let n = 0; n < points.length; n++) {
    const vec = {x: points[n].x - pt.x, y: points[n].y - pt.y};
    const curr = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (curr < len)
      return n;
  }

  return -1;
}

ReactDOM.render(<FitToParent><View points={points}/></FitToParent>, getContainer());