import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {VerticalScrollbar, HorizontalScrollbar} from 'controls/scrollbar';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';

class Test extends React.Component<{width?: number}, {imgWidth?: number}> {
  img: HTMLImageElement;
  scroll: HTMLDivElement;
  scrollX: number = 50;

  constructor(props) {
    super(props);
    this.state = {
      imgWidth: 999
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
      <div style={{display: 'flex', flexDirection: 'column', height: 500}}>
        <div
          onScroll = {e => { this.scrollX = (e.target as HTMLDivElement).scrollLeft; this.forceUpdate(); }} 
          id = 'scroll'
          ref = {e => this.scroll = e}
          style={{overflowX: 'auto', overflowY: 'hidden', flexGrow: 1, position: 'relative'}}>
          {this.renderDiv(999, 1000)}
        </div>
        <div style={{flexGrow: 1, minHeight: 16, maxHeight: 16}}>
          <FitToParent>
            <HorizontalScrollbar
              step = {5}
              value = {this.scrollX}
              maxValue = {this.state.imgWidth - this.props.width}
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