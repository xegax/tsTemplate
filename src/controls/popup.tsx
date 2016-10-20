import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Point} from 'common/point';
import {IThenable} from 'promise';

const classes = {
  popup: 'popup'
};

interface Props {
  children?: React.ReactChild;
  onMount?: (popup: Popup) => void;
  onUnmount?: (popup: Popup) => void;
}

interface State {
  left?: number;
  top?: number;
}

export class Popup extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    this.props.onMount && this.props.onMount(this);
  }

  componentWillUnmount() {
    this.props.onUnmount && this.props.onUnmount(this);
  }

  render() {
    const {left, top} = this.state;
    return (
      <div className={classes.popup} style={{left, top}}>{this.props.children}</div>
    );
  }
}

function findParentNode(node: HTMLElement, tgt: HTMLElement): boolean {
  while(node) {
    node = node.parentElement;
    if (node == tgt)
      return true;
  }

  return false;
}

export class PopupContext {
  private container: HTMLElement;

  static get(): PopupContext {
    return globalContext;
  }

  private onMouseDown = (event) => {
    if (!findParentNode(event.target, this.container))
      this.close();
  }

  show(pos: Point, control: React.ReactChild): IThenable<Popup> {
    this.close();
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    window.addEventListener('mousedown', this.onMouseDown);

    return new Promise((resolve, reject) => {
      ReactDOM.render((
        <Popup
          onMount={popup => {
            popup.setState({left: pos.x, top: pos.y});
            resolve(popup);
          }}
          onUnmount={popup => reject(popup)}
        >
          {control}
        </Popup>
      ), this.container);
    });
  }

  close() {
    if (this.container == null)
      return;

    this.container.removeEventListener('mousedown', this.onMouseDown);
    ReactDOM.unmountComponentAtNode(this.container);
    document.body.removeChild(this.container);
    this.container = null;
  }
}

let globalContext = new PopupContext();