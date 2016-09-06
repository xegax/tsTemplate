import * as React from 'react';
import {ScrollbarRenderer} from 'controls/scrollbar-renderer';
import {startDragging} from 'common/start-dragging';
import * as d3 from 'd3';

interface Props {
  width?: number;
  height?: number;
  noButtons?: boolean;
  nativeBehaviour?: boolean;  // as native scrollbar

  maxValue?: number;
  value?: number;

  onChanging?: (value: number) => void;
  onChanged?: (value: number) => void;
};

interface State {
  pos?: number;
  size?: number;
};

class Scrollbar extends React.Component<Props, State> {
  protected vertical: boolean;
  protected scale: d3.scale.Linear<number, number>;

  componentWillReceiveProps(newProps) {
    let res;
    let minThumbSize;
    if (this.vertical) {
      minThumbSize = newProps.width;
      res = this.getThumbSizeAndScale(newProps.height, newProps.width, newProps);
    } else {
      minThumbSize = newProps.height;
      res = this.getThumbSizeAndScale(newProps.width, newProps.height, newProps);
    }
    let pos = this.scale(this.state.pos);
    this.scale = res.scale;
    let newSize = Math.max(res.thumbSize, minThumbSize);
    
    let value = newProps.value;
    if (value == null) {
      value = pos;
    }
    let newPos = this.scale.invert(value);
    
    this.setState({pos: newPos, size: newSize});
  }

  onMouseDownThumb = e => {
    let pos;
    let args = {x: 0, y: 0};
    if (this.vertical) {
      args.y = this.state.pos;
    } else {
      args.x = this.state.pos;
    }

    let rangeBounds = this.getRangeBounds(this.state.size, this.props);
    startDragging(args, {
      onDragging: args => {
        let newState;
        if (this.vertical) {
          pos = args.y;
        } else {
          pos = args.x;
        }

        pos = Math.max(pos, rangeBounds[0]);
        pos = Math.min(pos, rangeBounds[1]);
        this.props.onChanging && this.props.onChanging(this.scale(pos));

        this.setState({pos});
      },
      onDragEnd: args => {
        this.props.onChanged && this.props.onChanged(this.scale(this.state.pos));
      }
    })(e);
  };

  getThumbSizeAndScale(availableLength: number, buttonSize: number, props: Props) {
    let minThumbSize = buttonSize;
    if (props.noButtons == false)
      availableLength -= buttonSize * 2;

    let maxValue = props.maxValue;
    if (this.props.nativeBehaviour)
      maxValue += availableLength;

    let thumbSize = Math.max(availableLength * availableLength / maxValue, minThumbSize);
    thumbSize = Math.min(thumbSize, availableLength);

    return {
      scale: d3.scale.linear()
        .domain(this.getRangeBounds(thumbSize, props))
        .range([0, props.maxValue]).clamp(true),
      thumbSize
    };
  }

  getRangeBounds(thumbSize: number, props: Props): Array<number> {
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
    range: [0, 1],
    width: 16,
    noButtons: false,
    nativeBehaviour: true
  };

  constructor(props) {
    super(props);
    this.vertical = true;

    let res = this.getThumbSizeAndScale(props.height, props.width, props);
    this.scale = res.scale;
    this.state = {
      pos: 0,
      size: res.thumbSize
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
        onMouseDownThumb={this.onMouseDownThumb}
      />
    );
  }
}

export class HorizontalScrollbar extends Scrollbar {
  static defaultProps = {
    range: [0, 1],
    height: 16,
    noButtons: false,
    nativeBehaviour: true
  };

  constructor(props: Props) {
    super(props);
    this.vertical = false;

    let res = this.getThumbSizeAndScale(props.width, props.height, props);
    this.scale = res.scale;
    this.state = {
      pos: 0,
      size: res.thumbSize
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
        onMouseDownThumb={this.onMouseDownThumb}
      />
    );
  }
}