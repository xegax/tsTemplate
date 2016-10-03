import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridRender, Cell} from 'controls/grid-render';
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
  renderHeader?(column: number): Cell;
  renderCell?(column: number, row: number): Cell;
  
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

  static defaultProps: Props = {
    vScroll: true,
    hScroll: true,

    width: 0,
    height: 0,

    columns: [],
    rows: 0,

    cellHeight: 30,

    aligned: false,

    renderHeader: (column: number) => ({ element: '' + column }),
    renderCell: (column: number, row: number) => ({ element: [column, row].join(':') })
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
    
    this.setState({scrollLeft, scrollTop}, () => this.onChanged());
  };

  private getScrollTop() {
    let {cellHeight, aligned} = this.props;
    return aligned ? Math.floor(this.state.scrollTop / cellHeight) * cellHeight : this.state.scrollTop;
  }

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
    this.setState({clientWidth: width, clientHeight: height}, () => this.onChanged());
  };

  private renderHeader() {
    const {
      cellHeight,
      columns,
      renderHeader
    } = this.props;
    
    const {
      clientWidth,
      scrollLeft
    } = this.state;

    return (
      <GridRender
        className = {classes.header}
        width = {clientWidth}
        height = {cellHeight}

        cellHeight = {cellHeight}
          
        columns = {columns}
        rows = {1}
          
        renderCell = {renderHeader}
          
        scrollLeft = {scrollLeft}
        scrollTop = {0}
      />
    );
  }

  private renderBody() {
    const {
      cellHeight,
      columns, rows,
      renderCell
    } = this.props;
    
    const {
      clientWidth, clientHeight,
      scrollLeft
    } = this.state;

    return (
      <GridRender
        className = {classes.body}
        ref = {e => this.map = e}

        width = {clientWidth}
        height = {clientHeight}

        cellHeight = {cellHeight}

        columns = {columns}
        rows = {rows}

        renderCell = {renderCell}
            
        scrollLeft = {scrollLeft}
        scrollTop = {this.getScrollTop()}
      />
    );
  }

  render() {
    const {
      width, height,
      cellHeight,
      columns, rows,
      renderHeader,
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
        {this.renderHeader()}
        <ScrollbarPanel
          width={width}
          height={height - cellHeight}

          contentWidth={contentWidth}
          contentHeight={contentHeight}

          onScrolling = {this.onScrolling}
          onClientSize = {this.onClientSize}

          vScrollStep={aligned ? cellHeight : 10}
          hScrollStep={10}

          vScroll={vScroll}
          hScroll={hScroll}
        >
          {this.renderBody()}
        </ScrollbarPanel>
      </div>
    );
  }
}