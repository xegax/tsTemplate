import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {VerticalScrollbar, HorizontalScrollbar} from 'controls/scrollbar';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';

class Test extends React.Component<{width?: number}, {imgWidth?: number, imgHeight?: number}> {
  img: HTMLImageElement;
  scroll: HTMLDivElement;
  scrollX: number = 50;
  scrollY: number = 0;
  height = 500;

  constructor(props) {
    super(props);
    this.state = {
      imgWidth: 999,
      imgHeight: 1000
    };
  }

  /*componentWillReceiveProps(newProps) {
    if (this.state.imgWidth - this.state.imgLeft < newProps.width) {
      this.setState({imgLeft: this.state.imgWidth - newProps.width});
    }
  }*/

  setScrollX(x: number) {
    this.scrollX = x;
    this.scroll.scrollLeft = x;
  }

  setScrollY(y: number) {
    this.scrollY = y;
    this.scroll.scrollTop = y;
  }

  renderImage() {
    return (
      <img
        onLoad = {e => this.setState({imgWidth: this.img.width})}
        ref = {e => this.img = e}
        src='../images/example1.jpg'
      />
    );
  }

  renderDiv(width, height) {
    return (
      <div
        style={{display: 'block', width, height}}
      />
    );
  }

  render() {
    return (
        <div style={{display: 'flex', flexDirection: 'column', height: this.height}}>
          <div style={{display: 'flex', flexDirection: 'row'}}>
            <div
              onScroll = {e => { this.scrollX = (e.target as HTMLDivElement).scrollLeft; this.forceUpdate(); }}
              id = 'scroll'
              ref = {e => this.scroll = e}
              style={{overflowX: 'auto', overflowY: 'auto', flexGrow: 1, position: 'relative'}}>
              {this.renderDiv(999, 1000)}
            </div>
            <div style={{flexGrow: 1, minWidth: 16, maxWidth: 16, lineHeight: 0}}>
              <FitToParent>
                <VerticalScrollbar
                  step = {5}
                  value = {this.scrollY}
                  maxValue = {this.state.imgHeight - (this.height - 32)}
                  onChanged = {value => this.setScrollY(value)}
                  onChanging = {value => this.setScrollY(value)}
                />
              </FitToParent>
            </div>
          </div>
          <div style={{flexGrow: 1, minHeight: 16, maxHeight: 16}}>
            <FitToParent>
              <HorizontalScrollbar
                step = {5}
                value = {this.scrollX}
                maxValue = {this.state.imgWidth - this.props.width + 16}
                onChanged = {value => this.setScrollX(value)}
                onChanging = {value => this.setScrollX(value)}
              />
            </FitToParent>
          </div>
        </div>
    );
  }
}

ReactDOM.render(<FitToParent><Test/></FitToParent>, createContainer());
