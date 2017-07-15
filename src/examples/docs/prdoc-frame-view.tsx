import * as React from 'react';
import {PrDocFrame, FrameObj} from './document';
import {Size} from 'common/point';
import {startDragging} from 'common/start-dragging';
import {Queue} from 'common/promise';

interface Props {
  frame: PrDocFrame;
  canvasSize: Size;
  makeObj: (x: number, y: number, parent?: FrameObj) => Promise<FrameObj>;
}

interface State {
  hover?: FrameObj;
}

const classes = {
  canvasWrapper: 'prdoc-view--canvas-wrapper',
  canvas: 'prdoc-view--canvas'
};

export class PrDocFrameView extends React.Component<Props, State> {
  private canvasRef: HTMLDivElement;

  constructor(props) {
    super(props);

    this.state = {
      hover: null
    };
  }

  private renderObj(obj: FrameObj, idx: number, parent?: FrameObj) {
    let lst = obj.getChildren().getSelectedItems();
    let rect = obj.getRect();
    return (
      <div
        onMouseDown={e => this.startDragging(obj, e, parent)}
        onDoubleClick={e => {
          e.preventDefault();
          e.stopPropagation();
          this.props.makeObj(10, 10, obj).then(this.updateView);
        }}
        key={idx}
        style={{
          position: 'absolute',
          left: rect.x, top: rect.y,
          width: rect.width, height: rect.height,
          border: '1px solid gray',
          backgroundColor: this.state.hover == obj ? 'silver' : 'white' 
        }}
      >
        {lst.map((child, idx) => this.renderObj(child, idx, obj))}
      </div>
    );
  }

  private startDragging(obj: FrameObj, e, parent?: FrameObj) {
    const rect = obj.getRect();
    startDragging({x: 0, y: 0}, {
      onDragging: (evt) => {
        let pt = this.getPoint(evt.event as any);
        let nextHover = this.hitTest(pt.x, pt.y, null, [obj]);
        obj.setOffs(evt.x, evt.y);

        if (this.state.hover != nextHover)
          this.setState({hover: nextHover});
        else
          this.setState({});
      },
      onDragEnd: (evt) => {
        let parentLst = parent ? parent.getChildren() : this.props.frame.getObjects();
        if (this.state.hover && this.state.hover != parent) {
          obj.setOffs(0, 0);
          obj.setPos(Math.random() * 30 - 15, Math.random() * 30 - 15);

          let hover = this.state.hover;
          let sel = parentLst.getSelectedItems();
          let n = sel.indexOf(obj);
          if (n != -1) {
            Queue.all(
              () => !evt.event.ctrlKey ? parentLst.remove(n) : null,
              () => hover.getChildren().append(obj),
              () => this.updateView()
            );
          }
        } else {
          obj.setOffs(0, 0);
          obj.setPos(rect.x + evt.x, rect.y + evt.y);
          this.setState({hover: null});
        }
      }
    })(e);
  }

  private hitTest(x: number, y: number, parent?: FrameObj, skip?: Array<FrameObj>): FrameObj {
    let lst = parent ? parent.getChildren().getSelectedItems() : this.props.frame.getObjects().getSelectedItems();
    for (let n = 0; n < lst.length; n++) {
      const rect = lst[n].getRect();
      const parentPos = parent ? parent.getRect() : {x: 0, y: 0};
      let res = this.hitTest(x - parentPos.x, y - parentPos.y, lst[n], skip);
      if (res)
        return res;
      
      if (x > rect.x && y > rect.y && x < rect.x + rect.width && y < rect.y + rect.height) {
        if (skip && skip.indexOf(lst[n]) != -1)
          continue;

        return lst[n];
      }
    }
    return null;
  }

  private renderObjects() {
    let lst = this.props.frame.getObjects();
    return lst.getItems(0, lst.getLength()).map((obj: FrameObj, idx) => this.renderObj(obj, idx));
  }

  private updateView = () => this.setState({});

  private getPoint(e: React.MouseEvent) {
    const bbox = this.canvasRef.getBoundingClientRect();
    return {x:  e.pageX - bbox.left, y: e.pageY - bbox.top};
  }

  private makeObject = (e: React.MouseEvent) => {
    const pt = this.getPoint(e);
    this.props.makeObj(pt.x, pt.y).then(this.updateView);
  }

  private onCanvasRef = (el: HTMLDivElement) => {
    this.canvasRef = el;
  }

  render() {
    const frame = this.props.frame;
    if (!frame)
      return null;

    return (
      <div className={classes.canvasWrapper}>
        <div
          ref={this.onCanvasRef}
          onDoubleClick={this.makeObject}
          className={classes.canvas}
          style={{width: this.props.canvasSize.width, height: this.props.canvasSize.height}}
        >
          {this.renderObjects()}
        </div>
      </div>
    );
  }
}