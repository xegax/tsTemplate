import React = require('react');
import d3 = require('d3');
import TypedReact = require('TypedReact');
import {dragHandler} from 'eventHelpers';

var CSS_RANGE_SLIDER = 'range-slider';
var CSS_RS_THUMB = 'rs-thumb';
var CSS_RS_SLIDER = 'rs-slider';
var CSS_RS_BAR = 'rs-bar';
var CSS_RS_SLIDER_CAUGHT = 'rs-slider-caught';
var CSS_RS_THUMB_CAUGHT = 'rs-thumb-caught';

enum Caught {
  None = -1,
  SliderLeft = 0,
  SliderRight = 1,
  Thumb = 2
};

interface Props {
  width?: number;
  height?: number;

  range: number[];
  rangeMax: number[];
  sliderSize?: number;

  onChanging?: (newRange: number[]) => void;
  onChanged?: (newRange: number[]) => void;
}

interface State {
  width?: number;
  height?: number;
  range?: number[];
  caughtElement?: Caught;
}

class RangeSliderComponent extends TypedReact.Component<Props, State> {
  getInitialState(): State {
    return {
      width: this.props.width,
      height: this.props.height,
      range: this.props.range.slice()
    };
  }

  getDefaultProps(): Props {
    return {
      width: 640,
      height: 480,
      rangeMax: [0, 1],
      range: [0, 1],
      sliderSize: 10
    };
  }

  componentWillReceiveProps(newProps: Props) {
    this.setState({range: newProps.range.slice()});
  }

  private getSlidersScale() {
    return d3.scale.linear()
      .domain(this.props.rangeMax)
      .range([0, this.props.width - this.props.sliderSize * 2]).clamp(true);
  }

  private onMouseDownBySlider(sliderIdx: Caught) {
    var scale = this.getSlidersScale();
    var pos = this.getSlidersPos(scale);
    pos = [pos[0], pos[1] - this.props.sliderSize];

    var borders;
    if (sliderIdx === Caught.SliderLeft)
      borders = [0, pos[1]];
    else
      borders = [pos[0], this.props.width];

    var initialDragVal = pos[sliderIdx];
    return dragHandler(initialDragVal, {
      onMoving: (dragVal: number) => {
        dragVal = Math.max(borders[0], dragVal);
        dragVal = Math.min(borders[1], dragVal);

        var newRange = this.state.range.slice();
        newRange[sliderIdx] = scale.invert(dragVal);

        if (this.state.range[0] === newRange[0] && this.state.range[1] === newRange[1])
          return;

        this.setState({range: newRange});
        this.props.onChanging && this.props.onChanging(newRange);
      },
      onMoved: (dragVal: number) => {
        this.setState({caughtElement: Caught.None});
        if (initialDragVal !== dragVal)
          this.props.onChanged && this.props.onChanged(this.state.range);
      },
      onCaught: (event: React.MouseEvent) => {
        this.setState({caughtElement: sliderIdx});
      }
    });
  }

  private onMouseDownByThumb() {
    var scale = this.getSlidersScale();
    var pos = this.getSlidersPos();
    var borders = [0, this.props.width - (pos[1] - pos[0]) - this.props.sliderSize];
    var size = this.state.range[1] - this.state.range[0];

    var initialDragVal = pos[0];
    return dragHandler(initialDragVal, {
      onMoving: (dragVal) => {
        dragVal = Math.max(borders[0], dragVal);
        dragVal = Math.min(borders[1], dragVal);

        var newRange = this.state.range.slice();
        newRange[0] = scale.invert(dragVal);
        newRange[1] = newRange[0] + size;

        if (newRange[0] === this.state.range[0] && newRange[1] === this.state.range[1])
          return;

        this.setState({range: newRange});
        this.props.onChanging && this.props.onChanging(newRange);
      },
      onMoved: (dragVal) => {
        this.setState({caughtElement: Caught.None});
        if (initialDragVal !== dragVal)
          this.props.onChanged && this.props.onChanged(this.state.range);
      },
      onCaught: () => {
        this.setState({caughtElement: Caught.Thumb});
      }
    });
  }

  private getSlidersPos(scale?: d3.scale.Linear<number,number>): number[] {
    var scale = scale || this.getSlidersScale();
    return [scale(this.state.range[0]), scale(this.state.range[1]) + this.props.sliderSize];
  }

  private getSliderClassName(sliderIdx: number) {
    if (this.state.caughtElement === sliderIdx)
      return CSS_RS_SLIDER + ' ' +  CSS_RS_SLIDER_CAUGHT;
    return CSS_RS_SLIDER;
  }

  private getThumbClassName() {
    if (this.state.caughtElement === Caught.Thumb)
      return CSS_RS_THUMB + ' ' + CSS_RS_THUMB_CAUGHT;
    return CSS_RS_THUMB;
  }

  render() {
    var style = {
      width: this.props.width,
      height: this.props.height
    };

    var sliderSize = this.props.sliderSize;
    var pos = this.getSlidersPos();

    var thumbMarginLeft = -1;
    var thumbMarginRight = -1;

    var thumbStyle: any = null;
    var thumbSize = pos[1]  - (pos[0] + sliderSize);
    if (thumbSize != 0) {
      thumbStyle = {
        left: pos[0] + sliderSize + thumbMarginLeft,
        width: thumbSize - (thumbMarginLeft + thumbMarginRight)
      };
    } else
      thumbStyle = {
        display: 'none'
      };

    return (<div className={CSS_RANGE_SLIDER} style={style} width={this.props.width} height={this.props.height}>
              <div className={CSS_RS_BAR}/>
              <div className={this.getThumbClassName()} onMouseDown = {this.onMouseDownByThumb()} style = {thumbStyle}/>
              <div className={this.getSliderClassName(Caught.SliderLeft)} onMouseDown = {this.onMouseDownBySlider(0)} style={{width: sliderSize, left: pos[0]}}/>
              <div className={this.getSliderClassName(Caught.SliderRight)} onMouseDown = {this.onMouseDownBySlider(1)} style={{width: sliderSize, left: pos[1]}}/>
            </div>);
  }
}

export var RangeSlider = TypedReact.createClass(RangeSliderComponent);