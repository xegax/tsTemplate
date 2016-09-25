import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {MapRender} from 'controls/map-render';
import {ScrollbarPanel} from 'controls/scrollbar-panel';

interface ChangeEvent {
  columns: Array<number>;
  rows: Array<number>;
  scrollLeft: number;
  scrollTop: number;
}

interface Props {
  width?: number;
  height?: number;

  vScroll?: boolean;
  hScroll?: boolean;

  columns?: number;
  rows?: number;

  cellWidth?: number;
  cellHeight?: number;

  scrollLeft?: number;
  scrollTop?: number;

  aligned?: boolean;
  renderCell?(column: number, row: number): React.ReactInstance;
  
  onChanged?(event: ChangeEvent);
}

interface State {
  clientWidth?: number;
  clientHeight?: number;
  scrollLeft?: number;
  scrollTop?: number;
}

const classes = {
  control: 'map_control',
  header: 'map_control--header',
  body: 'map_control--body'
};

export class MapControl extends React.Component<Props, State> {
  private map: MapRender;

  static defaultProps = {
    vScroll: true,
    hScroll: true,

    width: 0,
    height: 0,

    columns: 0,
    rows: 0,

    cellWidth: 150,
    cellHeight: 30,

    aligned: false,

    renderCell: (column: number, row: number) => {
      return column + ':' + row;
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      scrollLeft: 0,
      scrollTop: 0
    };
  }

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    
    if (this.props.aligned) {
      scrollTop = Math.floor(scrollTop / this.props.cellHeight) * this.props.cellHeight;
      scrollLeft = Math.floor(scrollLeft / this.props.cellWidth) * this.props.cellWidth;
    }
    
    this.setState({scrollLeft, scrollTop});
  };

  private onChanged() {
    if (!this.props.onChanged)
      return;

    let {scrollLeft, scrollTop} = this.state;
    this.props.onChanged({
      scrollLeft,
      scrollTop,
      columns: this.map.getColumnsRange(),
      rows: this.map.getRowsRange()
    });
  }

  private onClientSize = (event) => {
    let {width, height} = event;
    this.setState({clientWidth: width, clientHeight: height});
  };

  render() {
    const {
      width, height,
      cellWidth, cellHeight,
      columns, rows,
      renderCell,
      aligned,
      vScroll,
      hScroll
    } = this.props;
    
    const {
      clientWidth, clientHeight,
      scrollLeft, scrollTop
    } = this.state;

    let contentWidth = cellWidth * (columns + (aligned ? 1 : 0));
    let contentHeight = cellHeight * (rows + (aligned ? 1 : 0));

    return (
      <div className={classes.control}>
        <MapRender
          className = {classes.header}
          width = {clientWidth}
          height = {cellHeight}

          cellWidth = {cellWidth}
          cellHeight = {cellHeight}
          
          columns = {columns}
          rows = {1}
          
          renderCell = {renderCell}
          
          scrollLeft={scrollLeft}
          scrollTop={0}
        />
        <ScrollbarPanel
          width={width}
          height={height - cellHeight}

          contentWidth={contentWidth}
          contentHeight={contentHeight}

          onScrolling = {this.onScrolling}
          onClientSize = {this.onClientSize}

          vScrollStep={aligned ? cellHeight : 10}
          hScrollStep={aligned ? cellWidth : 10}

          vScroll={vScroll}
          hScroll={hScroll}
        >
          <MapRender
            className = {classes.body}
            ref = {e => this.map = e}

            width = {clientWidth}
            height = {clientHeight}

            cellWidth = {cellWidth}
            cellHeight = {cellHeight}

            columns = {columns}
            rows = {rows}

            renderCell = {renderCell}
            
            scrollLeft={scrollLeft}
            scrollTop={scrollTop}
          />
        </ScrollbarPanel>
      </div>
    );
  }
}