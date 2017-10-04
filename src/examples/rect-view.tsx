import {Rect, BoundRect, getRect, isPointInRect} from 'common/rect';
import {Point} from 'common/point';
import {assign, isEqual} from 'lodash';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {clamp} from 'common/common';
import {startDragging} from 'common/start-dragging';
import {Timer} from 'common/timer';
import {
  getItemRect,
  PointItem,
  makeQuad,
  createTransform,
  Transform,
  RectView
} from './points-view';

interface Props {
  width?: number;
  height?: number;
  points: Array<PointItem>;
}

interface State {
  canvasWidth?: number;
  canvasHeight?: number;
  dataWidth?: number;
  dataHeight?: number;
  model?: RectView;
  points?: Array<PointItem>;
}

function hitTest(arr: Array<PointItem>, tr: RectView, scrPoint: Point): PointItem {
  const point = {
    center: tr.getInvert(scrPoint),
    relRect: {x: 0, y: 0, width: 0, height: 0}
  };
  return arr.slice().reverse().find(item => isPointInRect(tr.get(point).center, tr.getRect(item)));
}

class View extends React.Component<Props, State> {
  private hoverPoint: number = -1;
  private dragging = false;
  private scalePoint: Point;
  private screen: Point;
  private sel = Array<PointItem>();
  private hover: PointItem;
  private hoverView: boolean;
  private offs: Point = {x: 0, y: 0};

  constructor(props: Props) {
    super(props);

    const model = createTransform(this.props.points);
    model.setViewSize(300, 300);
    const dataSize = model.getSize();

    this.state = {
      canvasWidth: 0,
      canvasHeight: 0,
      dataWidth: dataSize.width,
      dataHeight: dataSize.height,
      model,
      points: props.points
    };
  }

  componentWillReceiveProps(props: Props) {
    if (props.width == this.props.width && props.height == this.props.height)
      return;

    this.setState({}, this.updateCanvasSize);
  }

  clip: boolean = false;

  private renderCanvas() {
    const canvas = this.getCanvas();
    const ctx = canvas.getContext('2d');
    //ctx.save();
    ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);

    const viewRect = this.state.model.getViewRect();
    if (!this.clip) {
      ctx.rect(0, 0, viewRect.width, viewRect.height);
      ctx.stroke();
      ctx.clip();
      this.clip = true;
    }
    ctx.setTransform(1, 0, 0, 1, 0.5, 0.5);

    const model = this.state.model.getTransform();
    const points = this.props.points.slice();

    const render = (model: Transform) => {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'black';
      ctx.beginPath();
      points.forEach((pt, i) => {
        const sel = this.sel.indexOf(pt) != -1;
        const hover = this.hover == pt;
        ctx.fillStyle = (hover || sel) ? 'rgba(0, 200, 0, 0.5)' : 'rgba(255, 200, 200, 0.5)';
        pt = model.get(pt);
        const rect = getItemRect(pt);
        
        if (sel) {
          rect.x += this.offs.x;
          rect.y += this.offs.y;
        }

        ctx.moveTo(pt.center.x - 5, pt.center.y);
        ctx.lineTo(pt.center.x + 5, pt.center.y);

        ctx.moveTo(pt.center.x, pt.center.y - 5);
        ctx.lineTo(pt.center.x, pt.center.y + 5);

        
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      });

      const lt = model.getRect({center: this.state.model.getTransform().getInvert({x: 0, y: 0}), relRect: {x: 0, y: 0, ...model.getSize()}});
      ctx.rect(lt.x, lt.y, lt.width, lt.height);
    }

    render(this.state.model);

    ctx.strokeStyle = 'black';
    ctx.stroke();

    if (this.screen) {
      const rect = this.state.model.getTransform().getRect(makeQuad(this.screen, 6));
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    let dataSize = model.getSize();
    //ctx.strokeRect(0, 0, dataSize.width, dataSize.height);

    ctx.strokeRect(0, 0, viewRect.width, viewRect.height);

    ctx.closePath();
    //ctx.restore();
  }

  private updateCanvasSize = () => {
    const scroll = this.getScroll();
    const clientWidth = Math.round(scroll.clientWidth) + 1; 
    const clientHeight = Math.round(scroll.clientHeight) + 1; 
    if (clientWidth == this.state.canvasWidth && clientHeight == this.state.canvasHeight)
      return false;
    
    //this.state.model.setViewRect({x: scroll.scrollLeft, y: scroll.scrollTop, width: clientWidth - 2, height: clientHeight - 2});
    this.setState({
      canvasWidth: clientWidth,
      canvasHeight: clientHeight
    }, () => this.renderCanvas());
    return true;
  }

  private onScroll = () => {
    /*if (this.dragging)
      return;

    const scroll = this.getScroll();
    this.state.model.setViewRect({
      x: scroll.scrollLeft,
      y: scroll.scrollTop,
      width: this.state.canvasWidth - 1,
      height: this.state.canvasHeight - 1
    });
    this.renderCanvas();*/
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

  onWheel = (event: React.WheelEvent<HTMLElement>) => {
    /*const delta = -event.deltaY / Math.abs(event.deltaY);
    this.state.model.setScale(this.state.model.getScale() + delta / 100, this.getPoint(event));
    const scroll = this.getScroll();
    const view = this.state.model.getViewRect();
    scroll.scrollLeft = view.x;
    scroll.scrollTop = view.y;
    const dataSize = this.state.model.getDataSize();

    this.setState({dataWidth: dataSize.width, dataHeight: dataSize.height}, () => {
      if (!this.updateCanvasSize())
        this.renderCanvas();
    });*/
  }

  getPoint(event: MouseEvent | TouchEvent | React.MouseEvent<HTMLElement>) {
    const canvas = this.getCanvas()
    const bbox = canvas.getBoundingClientRect();
    const res = {x: -bbox.left, y: -bbox.top};
    if (!(event instanceof TouchEvent)) {
      res.x += event.pageX;
      res.y += event.pageY;
    }

    return res;
  }

  getViewPoint(event: MouseEvent | TouchEvent | React.MouseEvent<HTMLElement>) {
    const pt = this.getPoint(event);
    const view = this.state.model.getViewRect();
    return {x: view.x + pt.x, y: view.y + pt.y};
  }

  onMouseMove = (event) => {
    const point = this.getPoint(event);
    const rect = this.state.model.getViewRect();
    this.hover = hitTest(this.props.points, this.state.model, point);
    this.hoverView = !this.hover && isPointInRect(point, rect);
    this.screen = this.state.model.getTransform().getInvert(point);
    this.renderCanvas();
    
    /*const i = findClosest(this.getPoint(event), 10 / this.state.model.getScale());
    if (i != this.hoverPoint) {
      this.hoverPoint = i;
      this.renderCanvas();
    }*/
  }

  private moveVec: Point = {x: 0, y: 0};
  private startDrag: Point;
  private timer = new Timer(() => {
    if (this.moveVec.x == 0 && this.moveVec.y == 0)
      return;
    const rect = this.state.model.getViewRect();
    rect.x += this.moveVec.x;
    rect.y += this.moveVec.y;

    if (this.moveVec.x < 0)
      this.offs.x = rect.x - this.startDrag.x;
    else if (this.moveVec.x > 0)
      this.offs.x = rect.x + rect.width - this.startDrag.x;
    
    if (this.moveVec.y < 0)
      this.offs.y = rect.y - this.startDrag.y;
    else if (this.moveVec.y > 0)
      this.offs.y = rect.y + rect.height - this.startDrag.y;

    this.state.model.scrollToPoint(rect.x, rect.y);
    this.renderCanvas();
  });

  onMouseDown = (event: React.MouseEvent<HTMLElement> | MouseEvent) => {
    const scale = this.state.model.getScale();
    if (event.ctrlKey) {
      let len: number;
      startDragging({x: 0, y: 0}, {
        onDragStart: () => {
          const pt = this.getPoint(event);
          len = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
          this.scalePoint = {...pt};
          this.renderCanvas();
        },
        onDragging: (evt) => {
          const pt = this.getPoint(evt.event);
          const lenn = Math.sqrt(pt.x * pt.x + pt.y * pt.y);

          this.state.model.setScale(lenn * scale / len);
          this.renderCanvas();
        }, onDragEnd: () => {
          this.scalePoint = null;
          console.log(this.state.model.getScale());
          this.renderCanvas();
        }
      })(event as MouseEvent);
    } else if (this.hover) {
      this.sel = [this.hover];
      this.startDrag = this.getViewPoint(event);
      startDragging({x: 0, y: 0}, {
        onDragging: (evt => {
          const newPos = this.getViewPoint(evt.event);
          const offs = {x: newPos.x - this.startDrag.x, y: newPos.y - this.startDrag.y};
          const rect = this.state.model.getViewRect();

          if (newPos.x < rect.x)
            this.moveVec.x = -1;
          else if (newPos.x > rect.x + rect.width)
            this.moveVec.x = 1;
          else
            this.moveVec.x = 0;
          
          if (newPos.y < rect.y)
            this.moveVec.y = -1;
          else if (newPos.y > rect.y + rect.height)
            this.moveVec.y = 1;
          else
            this.moveVec.y = 0;

          if (this.moveVec.x || this.moveVec.y)
            this.timer.runRepeat(1);
          else
            this.timer.stop();

          this.offs.x = offs.x;
          this.offs.y = offs.y;
        }),
        onDragEnd: (evt) => {
          this.timer.stop();
          this.sel.forEach(pt => {
            pt.center.x += this.offs.x / scale;
            pt.center.y += this.offs.y / scale;
          });
          this.state.model.setPoints(this.props.points);
          this.sel = [];
          this.offs.x = 0;
          this.offs.y = 0;
          this.renderCanvas();
        }
      })(event as MouseEvent);
    } else {
      const rect = this.state.model.getViewRect();
      startDragging({x: 0, y: 0}, {
        onDragging: evt => {
          this.state.model.setViewPoint(rect.x - evt.x, rect.y - evt.y);
          this.renderCanvas();
        }
      })(event as MouseEvent);
    }
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

function getPoints() {
  const points = [];
  for (let n = 0; n < 10; n++) {
    const center = {
      x: Math.round(-11 + Math.random() * 200),
      y: Math.round(-100 + Math.random() * 390)
    };
    let size = {width: Math.round(50 + Math.random() * 50), height: Math.round(20 + Math.random() * 20)};
    let relRect = {x: -(10 + Math.round(Math.random() * (size.width - 10))), y: -(5 + Math.round(Math.random() * (size.height - 5))), ...size};
    points.push({center, relRect});
  }

  return points;
}

ReactDOM.render(<FitToParent><View points={getPoints()}/></FitToParent>, getContainer());