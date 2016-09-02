import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Timer} from 'common/timer';

interface Props extends React.Props<{}> {
  fitX?: boolean; // растягивание по оси x
  fitY?: boolean; // растягивание по оси y

  timer?: Timer;
}

interface State {
  width?: number;
  height?: number;
}

export var globTimer: Timer = new Timer();

// класс занимается растягиванием реактивных контролов по размеру не реактивного родителя,
// для этого он передаёт своим дочерним элементам width и height родителя

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
    this.state = {};

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
  }

  componentWillUnmount() {
    this.timer.removeCallback(this.doUpdateSizeCallback);
  }

  render() {
    return this.getChildren();
  }
}

/**
 * Decorator which provides detection of size changing
 */
export function provideSize(): ClassDecorator {
  /* tslint:disable:variable-name */
  return function(Component: React.ComponentClass<any>) {
  /* tslint:enable:variable-name */
    return class ComponentWithSize extends React.Component<any, State> {
      private node: HTMLElement;

      constructor(props) {
        super(props);
        this.state = {};
        this.node = null;
      }

      private updateSize = () => {
        const {offsetWidth, offsetHeight} = this.node;
        if (offsetWidth !== this.state.width || offsetHeight !== this.state.height) {
          this.setState({width: offsetWidth, height: offsetHeight});
        }
      };

      componentDidMount() {
        this.node = ReactDOM.findDOMNode<HTMLElement>(this);
        globTimer.addUniqueCallback(this.updateSize);
        if (!globTimer.isRunning()) {
          globTimer.runRepeat(100);
        }
      }

      componentWillUnmount() {
        globTimer.removeCallback(this.updateSize);
      }

      render() {
        return (
          <Component ref='wrapped' {...this.props} {...this.state} />
        );
      }
    };
  };
}

type Component = React.Component<any, any>;

export function wrapped<T extends Component>(wrapper: Component, ref: string): T {
  const component = wrapper.refs[ref] as Component;
  return component && component.refs['wrapped'] as T;
}
