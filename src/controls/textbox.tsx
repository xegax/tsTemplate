import * as React from 'react';
import {className} from 'common/common';

const classes = {
  control: 'control__textbox'
};

interface Props extends React.HTMLProps<any> {
}

interface State {
}

export class TextBox extends React.Component<Props, State> {
  render() {
    const props = {
      ...this.props,
      ...{className: className(classes.control, this.props.className)}
    };

    return (
      <input {...props}/>
    );
  }
}