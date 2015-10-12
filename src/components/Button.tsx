import TypedReact = require('TypedReact');
import React = require('react');

interface Props {
}

interface State {
}

class ButtonImpl extends TypedReact.Component<Props, State> {
  render() {
    return <span style={{backgroundColor: 'silver'}}>{'button'}</span>;
  }
}

export var Button = TypedReact.createClass(ButtonImpl);