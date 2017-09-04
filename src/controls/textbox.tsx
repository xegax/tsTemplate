import * as React from 'react';
import {className} from 'common/common';
import {KeyCode} from 'common/keycode';

const classes = {
  control: 'control__textbox'
};

interface Props extends React.HTMLProps<HTMLInputElement> {
  onEnter?: (value: string) => void;
  onCancel?: () => void;
  enterOnBlur?: boolean;
  defaultSelectAll?: boolean;
  defaultFocus?: boolean;
}

interface State {
}

export class TextBox extends React.Component<Props, State> {
  static defaultProps: Props = {
    defaultFocus: true,
    defaultSelectAll: true,
    enterOnBlur: true
  };
  private input: HTMLInputElement;

  private onRef = (e: HTMLInputElement) => {
    this.input = e;
    if (!this.input)
      return;

    if (this.props.defaultFocus)
      this.input.setSelectionRange(0, this.input.value.length);

    if (this.props.defaultFocus)
      this.input.focus();
  }

  private onKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.keyCode == KeyCode.Enter)
      this.props.onEnter && this.props.onEnter(this.input.value);
    
    if (evt.keyCode == KeyCode.Escape)
      this.props.onCancel && this.props.onCancel();
  }

  private onBlur = (evt: React.FocusEvent<HTMLInputElement>) => {
    if (this.props.enterOnBlur)
      this.props.onEnter && this.props.onEnter(this.input.value);
    else
      this.props.onCancel && this.props.onCancel();
  }

  render() {
    const {onEnter, onCancel, enterOnBlur, defaultSelectAll, defaultFocus, ...inputProps} = this.props;
    const props = {
      ...inputProps,
      ...{className: className(classes.control, this.props.className)}
    };

    return (
      <input onKeyDown={this.onKeyDown} onBlur={this.onBlur} {...props} ref={this.onRef}/>
    );
  }
}