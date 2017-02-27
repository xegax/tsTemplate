import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Point} from 'common/point';
import {startDragging} from 'common/start-dragging';

interface Props {
}

interface State {
  pos: Point;
}

class Container extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      pos: {x: 0, y: 0}
    };
  }


  onDrag(touch: boolean = false) {
    return (event) => {
      startDragging({
        x: this.state.pos.x, y: this.state.pos.y, touch
      }, {
        onDragging: (event) => {
          this.setState({pos: {x: event.x, y: event.y}});
        }
      })(event);
    };
  }

  onTouch() {
    return (event) => {
      event.preventDefault();
    };
  }

  
  renderBox() {
    const style = {
      position: 'absolute',
      width: 64,
      height: 64,
      backgroundColor: 'gray',
      left: this.state.pos.x,
      top: this.state.pos.y
    };

    return (
      <div style={style} onMouseDown={this.onDrag()} onTouchStart={this.onDrag(true)}/>
    );
  }

  render() {
    return (<div style={{flexGrow: 1, position: 'relative'}}>{this.renderBox()}</div>);
  }
}

ReactDOM.render(<Container/>, getContainer());