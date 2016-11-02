import * as React from 'react';
import * as ReactDOM from 'react-dom';

const classes = {
  component_container: 'component-container',
  react_container: 'react-container'
};

interface ReactCompHolder {
  id: number;
  child: React.ReactElement<any>;
}

interface State {
  list: Array<React.ReactElement<any>>;
}

class ReactContainer extends React.Component<{}, State> {
  constructor(props) {
    super(props);
    this.state = {list: []};
  }

  render() {
    return (
      <div className={classes.react_container}>
        {this.state.list}
      </div>
    );
  }
}

export class ComponentContainer {
  protected cont: HTMLDivElement;
  protected list = Array<ReactCompHolder>();
  protected elemList = Array<React.ReactElement<any>>();
  protected reactCont: ReactContainer;
  protected idCounter: number = 0;
  protected parent: HTMLElement;

  constructor(parent: HTMLElement) {
    this.parent = parent;
    this.cont = document.createElement('div');
    this.cont.className = classes.component_container;
    parent.appendChild(this.cont);
    this.reactCont = ReactDOM.render(<ReactContainer />, this.cont) as ReactContainer;
  }

  push(child: React.ReactElement<any>): number {
    const id = this.idCounter++;
    child = React.cloneElement(child, {key: id});
    this.list.push({id, child});
    this.updateElements();
    return id;
  }

  remove(id: number): boolean {
    for (let n = 0; n < this.list.length; n++) {
      if (this.list[n].id == id) {
        this.list.splice(n, 1);
        this.updateElements();
        return true;
      }
    }
  }

  pop() {
    this.list.pop();
    this.updateElements();
    this.reactCont.setState({list: this.elemList});
  }

  protected updateElements() {
    this.elemList = this.list.map(holder => holder.child);
    this.reactCont.setState({list: this.elemList});
  }

  forceUpdate() {
    this.reactCont.forceUpdate();
  }

  removeContainer() {
    ReactDOM.unmountComponentAtNode(this.cont);
    document.body.removeChild(this.cont);
    this.cont = null;
  }
}