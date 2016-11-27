import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Timer} from 'common/timer';

interface Props extends React.Props<{}> {
  fitX?: boolean; // растягивание по оси x
  fitY?: boolean; // растягивание по оси y

  timer?: Timer;
  width?: number;
  height?: number;
}

interface State {
  width?: number;
  height?: number;
}

export var globTimer: Timer = new Timer();

export class FitToParent extends React.Component<Props, State> {
  static defaultProps = {
    fitX: true,
    fitY: true,
    timer: globTimer
  };

  private parent: HTMLElement;
  private doUpdateSizeCallback: () => void;
  private timer: Timer;

  constructor(props: Props) {
    super(props);
    this.state = {
      width: props.width,
      height: props.height
    };

    this.doUpdateSizeCallback = () => this.doUpdateSize();
    this.timer = props.timer;
  }

  private doUpdateSize() {
    if (this.parent.offsetWidth === this.state.width && this.parent.offsetHeight === this.state.height)
      return;

    this.setState({
      width: this.parent.offsetWidth,
      height: this.parent.offsetHeight
    });
  }

  private getChildren() {
    if (!this.parent || React.Children.count(this.props.children) === 0)
      return <div/>;

    let children: React.ReactElement<any>[] = [];
    React.Children.forEach(this.props.children, (child: React.ReactElement<any>) => children.push(child));

    let newProps = {} as any;
    if (this.props.fitX)
      newProps.width = this.state.width;
    if (this.props.fitY)
      newProps.height = this.state.height;

    return React.cloneElement(children.slice(0, 1)[0], newProps);
  }

  componentDidMount() {
    let parent = ReactDOM.findDOMNode<HTMLElement>(this);
    if (parent)
      this.parent = parent.parentElement;

    this.doUpdateSize();
    this.timer.addUniqueCallback(this.doUpdateSizeCallback);
    if (!this.timer.isRunning())
      this.timer.runRepeat(100);
    this.forceUpdate();
  }

  componentWillUnmount() {
    this.timer.removeCallback(this.doUpdateSizeCallback);
  }

  render() {
    return this.getChildren();
  }
}
