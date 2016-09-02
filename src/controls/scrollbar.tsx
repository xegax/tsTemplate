import * as React from 'react';
import {ScrollbarRenderer} from 'controls/scrollbar-renderer';
import {startDragging} from 'common/start-dragging';
import * as d3 from 'd3';

interface Props {
  width?: number;
  height?: number;
  noButtons?: boolean;

  range?: Array<number>;
  pos?: number;
};

interface State {
  range: Array<number>
};

class Scrollbar extends React.Component<Props, State> {
  protected vertical: boolean;
  protected scale: d3.scale.Linear<number, number>;

  componentWillReceiveProps(newProps) {
    let res;
    let minThumbSize;
    if (this.vertical) {
      minThumbSize = newProps.width;
      res = this.getThumbRangeAndScale(newProps.height, newProps.width, newProps);
    } else {
      minThumbSize = newProps.height;
      res = this.getThumbRangeAndScale(newProps.width, newProps.height, newProps);
    }
    let pos = this.scale(this.state.range[0]);
    this.scale = res.scale;
    let size = Math.max(res.range[1] - res.range[0], minThumbSize);
    this.setState({range: [this.scale.invert(pos), this.scale.invert(pos) + size]});
  }

  onMouseDownThumb = (e) => {
    let args = {x: 0, y: 0};
    if (this.vertical) {
      args.y = this.state.range[0];
    } else {
      args.x = this.state.range[0];
    }

    let size = this.state.range[1] - this.state.range[0];
    let rangeBounds = this.getRangeBounds(this.state.range, this.props);
    startDragging(args, {
      onDragging: (args) => {
        let newState;
        let pos;
        if (this.vertical) {
          pos = args.y;
        } else {
          pos = args.x;
        }

        pos = Math.max(pos, rangeBounds[0]);
        pos = Math.min(pos, rangeBounds[1]);
        console.log(this.scale(pos));

        this.setState({range: [pos, pos + size]});
      }
    })(e);
  };

  getThumbRangeAndScale(availableLength: number, buttonSize: number, props: Props) {
    let minThumbSize = buttonSize;
    if (props.noButtons == false)
      availableLength -= buttonSize * 2;

    let thumbRange = [];
    let rangeSize = props.range[1] - props.range[0];
    if (availableLength < rangeSize) {
      thumbRange = [0, minThumbSize];
    } else {
      thumbRange = [0, Math.max(availableLength - rangeSize, minThumbSize)];
    }

    return {
      scale: d3.scale.linear().domain(this.getRangeBounds(thumbRange, props)).range(props.range),
      range: thumbRange
    };
  }

  getRangeBounds(thumbRange: Array<number>, props: Props): Array<number> {
    let buttonSize = this.vertical ? props.width : props.height;
    let thumbSize = thumbRange[1] - thumbRange[0];
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
    noButtons: false
  };

  constructor(props) {
    super(props);
    this.vertical = true;

    let res = this.getThumbRangeAndScale(props.height, props.width, props);
    this.scale = res.scale;
    this.state = {
      range: res.range
    };
  }

  render() {
    let props = this.props;
    return (
      <ScrollbarRenderer
        range={this.state.range}
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
    noButtons: false
  };

  constructor(props: Props) {
    super(props);
    this.vertical = false;

    let res = this.getThumbRangeAndScale(props.width, props.height, props);
    this.scale = res.scale;
    this.state = {
      range: res.range
    };
  }

  render() {
    let props = this.props;
    return (
      <ScrollbarRenderer
        range={this.state.range}
        length={props.width}
        thickness={props.height}
        buttons={!props.noButtons}
        vertical={false}
        onMouseDownThumb={this.onMouseDownThumb}
      />
    );
  }
}