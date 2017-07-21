import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Point} from 'common/point';
import {startDragging} from 'common/start-dragging';
import {Timer} from 'common/timer';

interface Props {
}

interface State {
  pos?: Point;
  stat?: string;
}

let counter = 0;
let iters = 0;
let counterSumm = 0;
let timeStamp = 0;
let timer: Timer;

class Container extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      pos: {x: 0, y: 0}
    };
    timer = new Timer(() => {
      counter++;
      const time = Date.now();
      if (time - timeStamp > 1000) {
        counterSumm += counter;
        iters++;
        timeStamp = time;
        this.setState({stat: '' + counter});
        counter = 0;
      }
    });
    timer.runRepeat(10);
  }


  onDrag() {
    return (event) => {
      startDragging({
        x: this.state.pos.x, y: this.state.pos.y
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
    const style: React.CSSProperties = {
      position: 'absolute',
      width: 64,
      height: 64,
      backgroundColor: 'gray',
      left: this.state.pos.x,
      top: this.state.pos.y
    };

    return (
      <div style={style} onMouseDown={this.onDrag()} onTouchStart={this.onDrag()}/>
    );
  }

  render() {
    return (
      <div style={{flexGrow: 1, position: 'relative'}}>
        <div style={{position: 'absolute', top: 0, left: 0}}>{this.state.stat}</div>
        {this.renderBox()}
      </div>
    );
  }
}

ReactDOM.render(<Container/>, getContainer());