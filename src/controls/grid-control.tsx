import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridRender} from 'controls/grid-render';
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

  columns?: Array<number>;
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
  columnsSize?: number;
}

const classes = {
  control: 'grid_control',
  header: 'grid_control--header',
  body: 'grid_control--body'
}; 

export class GridControl extends React.Component<Props, State> {
  private map: GridRender;

  static defaultProps = {
    vScroll: true,
    hScroll: true,

    width: 0,
    height: 0,

    columns: 0,
    rows: 0,

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
      scrollTop: 0,
      columnsSize: this.getColumnsSize(props.columns)
    };
  }

  componentWillReceiveProps(newProps) {
    this.setState({columnsSize: this.getColumnsSize(newProps.columns)});
  }

  private getColumnsSize(columns: Array<number>) {
    let size = 0;
    columns.forEach(s => size += s);
    return size;
  }

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    
    if (this.props.aligned) {
      scrollTop = Math.floor(scrollTop / this.props.cellHeight) * this.props.cellHeight;
      //scrollLeft = Math.floor(scrollLeft / this.props.cellWidth) * this.props.cellWidth;
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

    let contentWidth = this.state.columnsSize;
    let contentHeight = cellHeight * (rows + (aligned ? 1 : 0));

    return (
      <div className={classes.control}>
        <GridRender
          className = {classes.header}
          width = {clientWidth}
          height = {cellHeight}

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
          <GridRender
            className = {classes.body}
            ref = {e => this.map = e}

            width = {clientWidth}
            height = {clientHeight}

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