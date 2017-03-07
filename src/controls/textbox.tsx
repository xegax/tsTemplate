import * as React from 'react';
import {className} from 'common/common';
import {assign} from 'lodash';

const classes = {
  control: 'control__textbox'
};

interface Props extends React.HTMLProps<any> {
}

interface State {
}

export class TextBox extends React.Component<Props, State> {
  render() {
    const props = assign({}, this.props);
    delete props.className;

    return (
      <input className={className(classes.control, this.props.className)} {...props}/>
    );
  }
}