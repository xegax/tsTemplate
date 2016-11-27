import * as React from 'react';
import {HorizontalScrollbar, VerticalScrollbar} from 'controls/scrollbar/scrollbar';
import {isEqual, assign} from 'lodash';

interface State {
  scrollTop?: number;
  scrollLeft?: number;
  clientWidth?: number;
  clientHeight?: number;
}

interface ScrollEvent {
  scrollLeft: number;
  scrollTop: number;
}

interface SizeEvent {
  width: number;
  height: number;
}

interface Props {
  width?: number;
  height?: number;

  contentWidth?: number;
  contentHeight?: number;

  children?: React.ReactChild;

  onScrolling?: (event: ScrollEvent) => void;
  onClientSize?: (event: SizeEvent) => void;

  vScrollStep?: number;
  hScrollStep?: number;

  vScroll?: boolean;
  hScroll?: boolean;

  scrollLeft?: number;
  scrollTop?: number;
}

const classes = {
  scrollbarpanel: 'scrollbar--panel',
  content: 'scrollbar--panel--content'
};

export class ScrollbarPanel extends React.Component<Props, State> {
  hasMount: boolean = false;
  defferedEvents: Array<() => void>;

  static defaultProps = {
    vScroll: true,
    hScroll: true
  };

  scrollbarSize = 16;

  constructor(props) {
    super(props);
    this.state = {
      scrollLeft: 0,
      scrollTop: 0,
      clientWidth: 0,
      clientHeight: 0
    };

    assign(this.state, this.getUpdatedState(props, {}, true));
  }

  private getUpdatedState(newProps: Props, props: Props, defferEvent: boolean): State {
    let state: State = {};

    let size = this.getClientSize(newProps, newProps.width, newProps.height);

    let scrolled = 0;
    let scrollEvent: ScrollEvent = {
      scrollLeft: this.state.scrollLeft,
      scrollTop: this.state.scrollTop
    };

    let resized = 0;
    let sizeEvent: SizeEvent = {
      width: size[0],
      height: size[1]
    };

    if (newProps.scrollTop != null && this.state.scrollTop != newProps.scrollTop) {
      scrollEvent.scrollTop = newProps.scrollTop;
      state.scrollTop = newProps.scrollTop;
      scrolled++;
    }

    if (newProps.scrollLeft != null && this.state.scrollLeft != newProps.scrollLeft) {
      scrollEvent.scrollLeft = newProps.scrollLeft;
      state.scrollLeft = newProps.scrollLeft;
      scrolled++;
    }

    if (!isEqual([this.state.clientWidth, this.state.clientHeight], size)) {
      state.clientWidth = size[0];
      state.clientHeight = size[1];
      resized++;
    }

    if (newProps.contentWidth - this.state.scrollLeft < size[0]) {
      let scrollLeft = Math.max(0, newProps.contentWidth - size[0]);
      if (scrollLeft != this.state.scrollLeft)
        state.scrollLeft = scrollLeft;
    }

    if (newProps.contentHeight - this.state.scrollTop < size[1]) {
      let scrollTop = Math.max(0, newProps.contentHeight - size[1]);
      if (scrollTop != this.state.scrollTop)
        state.scrollTop = scrollTop;
    }

    if (state.scrollLeft != null || state.scrollTop != null) {
      let {scrollLeft, scrollTop} = state;

      if (scrollLeft == null)
        scrollLeft = this.state.scrollLeft;

      if (scrollTop == null)
        scrollTop = this.state.scrollTop;

      scrollEvent.scrollLeft = scrollLeft;
      scrollEvent.scrollTop = scrollTop;
      scrolled++;
    }

    let events = [];
    if (scrolled && this.props.onScrolling)
      events.push(() => this.props.onScrolling(scrollEvent));

    if (resized && this.props.onClientSize)
      events.push(() => this.props.onClientSize(sizeEvent));

    let runEvents = () => events.forEach(e => e());
    if (defferEvent) {
      this.defferedEvents = events;
    } else {
      runEvents();
    }

    return state;
  }

  componentDidMount() {
    if (this.defferedEvents)
      this.defferedEvents.forEach(e => e());
    this.defferedEvents = null;
  }

  componentWillReceiveProps(newProps: Props) {
    let state = this.getUpdatedState(newProps, this.props, false);
    this.setState(state);
  }

  private getClientSize(props: Props, width: number, height: number): Array<number> {
    let {contentWidth, contentHeight} = props;

    let i = 0;
    let diffWidth = width - contentWidth;
    if (diffWidth < 0 && props.hScroll)
      height -= this.scrollbarSize, i++;

    let diffHeight = height - contentHeight;
    if (diffHeight < 0 && props.vScroll)
      width -= this.scrollbarSize;

    diffWidth = width - contentWidth;
    if (i == 0 && diffWidth < 0 && props.hScroll)
      height -= this.scrollbarSize;

    return [width, height];
  }

  private onScrolling(scrollLeft: number, scrollTop: number) {
    if (scrollLeft == this.state.scrollLeft && scrollTop == this.state.scrollTop)
      return;

    this.setState({scrollLeft, scrollTop}, () => {
      this.props.onScrolling && this.props.onScrolling({scrollLeft, scrollTop});
    });
  }

  render() {
    let {width, height} = this.props;
    if (width == null || height == null)
      return null;

    let {clientWidth, clientHeight} = this.state;
    let vScroll = clientWidth != width && this.props.vScroll;
    let hScroll = clientHeight != height && this.props.hScroll;

    let {contentWidth, contentHeight} = this.props;
    return (
      <div className={classes.scrollbarpanel} style={{width, height}}>
        <div className={classes.content}
          style={{width: Math.min(clientWidth, contentWidth), height: Math.min(clientHeight, contentHeight)}}
        >
          {this.props.children}
        </div>
        {vScroll ? (
          <VerticalScrollbar
            step = {this.props.vScrollStep}
            value = {this.state.scrollTop}
            maxValue = {contentHeight - clientHeight}
            width = {this.scrollbarSize}
            height = {clientHeight}
            onChanged = {e => this.onScrolling(this.state.scrollLeft, e)}
            onChanging = {e => this.onScrolling(this.state.scrollLeft, e)}/>
          ) : null}
        {hScroll ? (
          <HorizontalScrollbar
            step = {this.props.hScrollStep}
            value = {this.state.scrollLeft}
            maxValue = {contentWidth - clientWidth}
            width = {clientWidth}
            height = {this.scrollbarSize}
            onChanged = {e => this.onScrolling(e, this.state.scrollTop)}
            onChanging = {e => this.onScrolling(e, this.state.scrollTop)}/>
          ) : null}
      </div>
    );
  }
}
