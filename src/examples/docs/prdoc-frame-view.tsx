import * as React from 'react';
import {PrDocFrame, FrameObj} from './document';
import {Size} from 'common/point';
import {startDragging} from 'common/start-dragging';

interface Props {
  frame: PrDocFrame;
  canvasSize: Size;
  makeObj: (x: number, y: number) => Promise<FrameObj>;
}

interface State {
}

const classes = {
  canvasWrapper: 'prdoc-view--canvas-wrapper',
  canvas: 'prdoc-view--canvas'
};

export class PrDocFrameView extends React.Component<Props, State> {
  private canvasRef: HTMLDivElement;

  private renderObj(obj: FrameObj, idx: number) {
    let rect = obj.getRect();
    return (
      <div
        onMouseDown={e => this.startDragging(obj, e)}
        key={idx}
        style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height, border: '1px solid gray'}}
      />
    );
  }

  private startDragging(obj: FrameObj, e) {
    const rect = obj.getRect();
    startDragging({x: 0, y: 0}, {
      onDragging: (evt) => {
        obj.setOffs(evt.x, evt.y);
        this.setState({});
      },
      onDragEnd: (evt) => {
        obj.setOffs(0, 0); 
        obj.setPos(rect.x + evt.x, rect.y + evt.y);
        this.setState({});
      }
    })(e);
  }

  private renderObjects() {
    let lst = this.props.frame.getObjects();
    return lst.getItems(0, lst.getLength()).map((obj: FrameObj, idx) => this.renderObj(obj, idx));
  }

  private updateView = () => this.setState({});

  private makeObject = (e: React.MouseEvent) => {
    const bbox = this.canvasRef.getBoundingClientRect();
    this.props.makeObj(e.pageX - bbox.left, e.pageY - bbox.top).then(this.updateView);
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