import TypedReact = require('typed-react');
import React = require('react');

interface Props {
}

interface State {
}

class ReactComponent extends TypedReact.Component<Props, State> {
  getInitialState(): State {
    return {};
  }
    
  getDefaultProps(): Props {
    return {};
  }
  
  render() {
    var text = 'ReactComponent text content';
    var style = {
      border: '1px solid black',
      display: 'inline-block'
    };
    
    return JSX(`
      <div style = {style}>
        {text}
      </div>`);
  }
}

export var Widget = TypedReact.createClass<Props, State>(ReactComponent);