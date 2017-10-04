import * as React from 'react';
import {Size, Point} from 'common/point';
import {Rect} from 'common/rect';
import {CanvasViewModel} from './canvas-view-model';

export {
  CanvasViewModel
};

interface State {
  canvasWidth?: number;
  canvasHeight?: number;
}

interface Props {
  model: CanvasViewModel;
  width?: number;
  height?: number;
  style?: React.CSSProperties;

  onMouseDown?: (point: Point, event: React.MouseEvent<HTMLElement>) => void;
  onMouseMove?: (point: Point, event: React.MouseEvent<HTMLElement>) => void;
}

const classes = {
  control: 'canvas-view'
};

export class CanvasView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      canvasWidth: 0,
      canvasHeight: 0
    };
  }

  private onScrolled = (mask: number) => {
    if (!(mask & CanvasViewModel.Events.viewPoint) || !this.scroll)
      return;

    const view = this.props.model.getViewPoint();
    this.scroll.scrollLeft = view.x;
    this.scroll.scrollTop = view.y;
  };

  private onRender = (mask: number) => {
    if (!(mask & CanvasViewModel.Events.update))
      return;

    this.renderCanvas();
  };

  componentDidUpdate() {
    this.updateCanvasSize(this.renderCanvas);
  }

  componentDidMount() {
    [
      this.onScrolled,
      this.onRender
    ].forEach(subscriber => {
      this.props.model.getPublisher().addSubscriber(subscriber);
    });

    this.updateCanvasSize(this.renderCanvas);
  }

  componentWillUnmount() {
    [
      this.onScrolled,
      this.onRender
    ].forEach(subscriber => {
      this.props.model.getPublisher().removeSubscriber(subscriber);
    });
  }

  componentWillReceiveProps(props: Props) {
    if (props.width == this.props.width && props.height == this.props.height && props.model == this.props.model)
      return;

    this.setState({}, () => this.updateCanvasSize(this.renderCanvas));
  }

  private updateCanvasSize(callback?: () => void) {
    if (!this.scroll)
      return;

    const width = this.scroll.clientWidth;
    const height = this.scroll.clientHeight;
    if (width == this.state.canvasWidth && height == this.state.canvasHeight)
      return;

    this.props.model.setCanvasSize(width, height);
    this.props.model.setViewPoint(this.scroll.scrollLeft, this.scroll.scrollTop);

    this.setState({
      canvasWidth: width,
      canvasHeight: height
    }, callback);
  }

  private renderCanvas = () => {
    this.props.model.onRender(this.canvas.getContext('2d'));
  };

  private onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    this.props.model.setViewPoint(this.scroll.scrollLeft, this.scroll.scrollTop);
    this.renderCanvas();
  }
  
  private scroll: HTMLDivElement;
  private scrollRef = (ref: HTMLDivElement) => this.scroll = ref;

  private canvas: HTMLCanvasElement;
  private canvasRef = (ref: HTMLCanvasElement) => {
    this.canvas = ref;
  };

  private getMousePoint(event: React.MouseEvent<HTMLElement>): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.pageX - rect.left,
      y: event.pageY - rect.top
    };
  }

  private onMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onMouseMove && this.props.onMouseMove(this.getMousePoint(event), event);
  };

  private onMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    this.props.onMouseDown && this.props.onMouseDown(this.getMousePoint(event), event);
  };

  render() {
    const {width, height, model} = this.props;
    const size = model.getContentSize();
    return (
      <div className={classes.control} style={{position: 'absolute', ...this.props.style, width, height}}>
        <div ref={this.scrollRef} style={{overflow: 'auto', width, height}} onScroll={this.onScroll}>
          <div style={{...size}}/>
        </div>
        <canvas
          ref={this.canvasRef}
          style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}
          width={this.state.canvasWidth}
          height={this.state.canvasHeight}
          onMouseMove={this.onMouseMove}
          onMouseDown={this.onMouseDown}
        />
      </div>
    );
  }
}
