import * as React from 'react';
import {ScrollbarRenderer} from 'controls/scrollbar/scrollbar-renderer';
import {startDragging} from 'common/start-dragging';
import * as d3 from 'd3';
import {clamp} from 'common/common';
import {Timer} from 'common/timer';

interface Props {
  width?: number;
  height?: number;
  noButtons?: boolean;
  nativeBehaviour?: boolean;  // as native scrollbar

  step?: number;
  value?: number;
  maxValue?: number;

  onChanging?: (value: number) => void;
  onChanged?: (value: number) => void;
};

interface State {
  pos?: number;
  size?: number;
  stepVector?: number;
};

class Scrollbar extends React.Component<Props, State> {
  protected vertical: boolean;
  protected scale: d3.scale.Linear<number, number>;
  protected timer = new Timer(() => {
    this.nextStep();
    this.timer.run(50);
  });

  componentWillReceiveProps(newProps) {
    if (this.vertical) {
      var minThumbSize = newProps.width;
      var res = this.getScaleAndThumbSize(newProps.height, newProps.width, newProps);
    } else {
      var minThumbSize = newProps.height;
      var res = this.getScaleAndThumbSize(newProps.width, newProps.height, newProps);
    }
    var {scale, thumbSize} = res;
    let prevValue = this.scale(this.state.pos);
    this.scale = scale;

    let value = newProps.value;
    if (value == null) {
      value = prevValue;
    }
    let pos = this.scale.invert(value);
    let size = Math.max(thumbSize, minThumbSize);
    this.setState({pos, size});
  }

  protected onMouseDownButton = (button, e) => {
    let stepVector = (button == 0) ? -1 : 1;
    this.setState({stepVector});
    startDragging({x: 0, y: 0}, {
      onDragEnd: () => {
        this.timer.stop();
      }
    })(e);
    this.timer.run(500);
    this.nextStep(stepVector);
  }

  protected nextStep(stepVector?: number) {
    let value = this.props.value;
    if (value == null)
      value = this.scale(this.state.pos);

    if (stepVector == null)
      stepVector = this.state.stepVector;

    if (stepVector == -1) {
      var newValue = Math.max(0, value + stepVector * this.props.step);
    } else {
      var newValue = Math.min(Math.max(0, this.props.maxValue), value + stepVector * this.props.step);
    }
    if (value != newValue) {
      this.props.onChanged && this.props.onChanged(newValue);
    }
  }

  protected onMouseDownThumb = e => {
    let pos;
    let args = {x: 0, y: 0};
    if (this.vertical) {
      args.y = this.state.pos;
    } else {
      args.x = this.state.pos;
    }

    const rangeBounds = this.getRangeBounds(this.state.size, this.props);
    startDragging(args, {
      onDragging: args => {
        if (this.vertical) {
          pos = args.y;
        } else {
          pos = args.x;
        }

        pos = clamp(pos, rangeBounds);
        this.setState({pos});
        this.props.onChanging && this.props.onChanging(this.scale(pos));
      },
      onDragEnd: args => {
        this.props.onChanged && this.props.onChanged(this.scale(this.state.pos));
      }
    })(e);
  };

  protected getScaleAndThumbSize(availableSpace: number, buttonSize: number, props: Props) {
    const minThumbSize = buttonSize;
    if (props.noButtons == false)
      availableSpace -= buttonSize * 2;

    let maxValue = props.maxValue;
    if (this.props.nativeBehaviour)
      maxValue += availableSpace;

    let thumbSize = clamp(availableSpace * availableSpace / maxValue, [minThumbSize, availableSpace]);

    return {
      scale: d3.scale.linear()
        .domain(this.getRangeBounds(thumbSize, props))
        .range([0, props.maxValue])
        .clamp(true),
      thumbSize
    };
  }

  protected getRangeBounds(thumbSize: number, props: Props): Array<number> {
    let buttonSize = this.vertical ? props.width : props.height;
    let length = this.vertical ? props.height : props.width;

    if (this.props.noButtons) {
      return [0, length - thumbSize];
    } else {
      return [0, length - (buttonSize * 2 + thumbSize)];
    }
  }
};

export class VerticalScrollbar extends Scrollbar {
  static defaultProps = {
    step: 1,
    value: 0,
    maxValue: 1,
    width: 16,
    noButtons: false,
    nativeBehaviour: true
  };

  constructor(props: Props) {
    super(props);
    this.vertical = true;

    let {scale, thumbSize} = this.getScaleAndThumbSize(props.height, props.width, props);
    this.scale = scale;
    this.state = {
      pos: 0,
      size: thumbSize,
      stepVector: 0
    };
  }

  render() {
    let props = this.props;
    return (
      <ScrollbarRenderer
        range={[this.state.pos, this.state.pos + this.state.size]}
        length={props.height}
        thickness={props.width}
        buttons={!props.noButtons}
        vertical={true}
        onMouseDownButton={this.onMouseDownButton}
        onMouseDownThumb={this.onMouseDownThumb}
      />
    );
  }
}

export class HorizontalScrollbar extends Scrollbar {
  static defaultProps = {
    step: 1,
    value: 0,
    maxValue: 1,
    height: 16,
    noButtons: false,
    nativeBehaviour: true
  };

  constructor(props: Props) {
    super(props);
    this.vertical = false;

    let {scale, thumbSize} = this.getScaleAndThumbSize(props.width, props.height, props);
    this.scale = scale;
    this.state = {
      pos: 0,
      size: thumbSize,
      stepVector: 0
    };
  }

  render() {
    let props = this.props;
    return (
      <ScrollbarRenderer
        range={[this.state.pos, this.state.pos + this.state.size]}
        length={props.width}
        thickness={props.height}
        buttons={!props.noButtons}
        vertical={false}
        onMouseDownButton={this.onMouseDownButton}
        onMouseDownThumb={this.onMouseDownThumb}
      />
    );
  }
}
