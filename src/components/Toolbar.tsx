import TypedReact = require('TypedReact');
import React = require('react');

interface Props {
};

interface State {
};

class ToolbarImpl extends TypedReact.Component<Props, State> {
  render() {
    return <span style={{backgroundColor: 'silver'}}>{'toolbar'}</span>;
  }
}

export var Toolbar = TypedReact.createClass(ToolbarImpl);