import * as React from 'react';
import {className} from 'common/common';
import {startDragging} from 'common/start-dragging';

interface Props {
  length: number;
  thickness?: number;
  buttons?: boolean;
  range?: Array<number>;
  vertical?: boolean;

  onMouseDownThumb?: (e: React.MouseEvent) => void;
  onMouseDownButton?: (button: number, e: React.MouseEvent) => void;
}

interface State {
}

const classes = {
  scrollbar: 'scrollbar',
  thumb: 'scrollbar--thumb',
  button: 'scrollbar--button',
  up: 'scrollbar--up',
  down: 'scrollbar--down',
  left: 'scrollbar--left',
  right: 'scrollbar--right'
};

export class ScrollbarRenderer extends React.Component<Props, State> {
  static defaultProps = {
    thickness: 16,
    buttons: true,
    range: [0, 16],
    vertical: false
  };

  renderVertical() {
    let thumbStart = 0;
    if (this.props.buttons)
      thumbStart = this.props.thickness;

    let styles = {
      width: this.props.thickness,
      height: this.props.length
    };

    let buttonStyles = {
      width: this.props.thickness,
      height: this.props.thickness
    };

    let thumbStyles = {
      width: this.props.thickness,
      height: this.props.range[1] - this.props.range[0],
      top: thumbStart + this.props.range[0]
    };

    let buttonUp = this.props.buttons ? (
      <div
        onMouseDown={e => this.props.onMouseDownButton && this.props.onMouseDownButton(0, e)}
        style={buttonStyles}
        className={className(classes.button, classes.up)}
      />
    ) : null;

    let buttonDown = this.props.buttons ? (
      <div
        onMouseDown={e => this.props.onMouseDownButton && this.props.onMouseDownButton(1, e)}
        style={buttonStyles}
        className={className(classes.button, classes.down)}
      />
    ) : null;

    return (
      <div style={styles} className={classes.scrollbar}>
        {buttonUp}
        {buttonDown}
        <div
          style={thumbStyles}
          className={classes.thumb}
          onMouseDown={this.props.onMouseDownThumb}
        />
      </div>
    );
  }

  renderHorizontal() {
    let thumbStart = 0;
    if (this.props.buttons)
      thumbStart = this.props.thickness;

    let styles = {
      width: this.props.length,
      height: this.props.thickness
    };

    let buttonStyles = {
      width: this.props.thickness,
      height: this.props.thickness
    };

    let thumbStyles = {
      width: this.props.range[1] - this.props.range[0],
      height: this.props.thickness,
      left: thumbStart + this.props.range[0]
    };

    let buttonLeft = this.props.buttons ? (
      <div
        style={buttonStyles}
        className={className(classes.button, classes.left)}
        onMouseDown={e => this.props.onMouseDownButton && this.props.onMouseDownButton(0, e)}
      />
    ) : null;

    let buttonRight = this.props.buttons ? (
      <div
        style={buttonStyles}
        className={className(classes.button, classes.right)}
        onMouseDown={e => this.props.onMouseDownButton && this.props.onMouseDownButton(1, e)}
      />
    ) : null;

    return (
      <div style={styles} className={classes.scrollbar}>
        {buttonLeft}
        {buttonRight}
        <div
          style={thumbStyles}
          className={classes.thumb}
          onMouseDown={this.props.onMouseDownThumb}
        />
      </div>
    );
  }

  render() {
    if (this.props.vertical) {
      return this.renderVertical();
    } else {
      return this.renderHorizontal();
    }
  }
}