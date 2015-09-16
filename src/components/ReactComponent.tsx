import TypedReact = require('../TypedReact');
import React = require('react');

interface Props {
}

interface State {
}

class Component extends TypedReact.Component<Props, State> {
  getInitialState(): State {
    return {};
  }
    
  getDefaultProps(): Props {
    return {};
  }
  
  render() {
    var text = 'ReactComponent text content';
    var style: any = {
      border: '1px solid black',
      display: 'inline-block'
    };
    
    return (
      <div style = {style}>
        {text}
      </div>);
  }
}

export var ReactComponent = TypedReact.createClass(Component);