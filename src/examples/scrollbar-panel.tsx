import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {ScrollbarPanel} from 'controls/scrollbar-panel';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {MapRender} from 'controls/map/map-render';

interface State {
  clientWidth?: number;
  clientHeight?: number;

  contentWidth?: number;
  contentHeight?: number;

  scrollTop?: number;
  scrollLeft?: number;

  columns?: number;
  rows?: number;
}

class Test extends React.Component<{width?: number, height?: number}, State> {
  cont: HTMLDivElement;
  columns = 8000000000;
  rows = 44;
  cellWidth = 150;
  cellHeight = 30;

  constructor(props) {
    super(props);
    this.state = {
      contentWidth: this.cellWidth * this.columns,
      contentHeight: this.cellHeight * this.rows,

      clientWidth: props.width,
      clientHeight: props.height,

      scrollTop: 0,
      scrollLeft: 0
    };
  }

  onScrolling = (event) => {
    let {scrollTop, scrollLeft} = event;
    this.setState({scrollTop, scrollLeft});
  };

  onClientSize = (event) => {
    this.setState({clientWidth: event.width, clientHeight: event.height});
  };

  render() {
    return (
      <div>
        <ScrollbarPanel
          width={this.props.width}
          height={this.props.height}
          contentWidth={this.state.contentWidth}
          contentHeight={this.state.contentHeight}
          onScrolling = {this.onScrolling}
          onClientSize = {this.onClientSize}
        >
          <MapRender
            width = {this.state.clientWidth}
            height = {this.state.clientHeight}
            cellWidth = {this.cellWidth}
            cellHeight = {this.cellHeight}
            columns = {this.columns}
            rows = {this.rows}
            scrollTop = {this.state.scrollTop}
            scrollLeft = {this.state.scrollLeft}
          />
        </ScrollbarPanel>
        <div style = {{marginBottom: '10px', position: 'fixed', top: '30px'}}>
          <button onClick={e => this.setState({contentWidth: 400, contentHeight: 300})}>400x300</button>
        </div>
      </div>
    );
  }
}

let cont = createContainer();
cont.style.position = 'fixed';
cont.style.top = '50px';
cont.style.bottom = '5px';
cont.style.left = '5px';
cont.style.right = '5px';
ReactDOM.render(<FitToParent><Test/></FitToParent>, cont);
