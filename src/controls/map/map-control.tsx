import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {MapRender, Props as MapRenderProps, Cell} from 'controls/map/map-render';
import {ScrollbarPanel} from 'controls/scrollbar-panel';
import {KeyCode} from 'common/keycode';
import {startDragging} from 'common/start-dragging';
import {assign} from 'lodash';

interface ChangeEvent {
  columns: Array<number>;
  rows: Array<number>;
  scrollLeft: number;
  scrollTop: number;
}

interface Props extends React.Props<any> {
  width?: number;
  height?: number;

  vScroll?: boolean;
  hScroll?: boolean;

  columns?: number;
  rows?: number;

  cellWidth?: number;
  cellWidthMinMax?: Array<number>;
  cellHeight?: number;

  alignedRows?: boolean;
  selectable?: boolean;
  resizable?: boolean;
  renderCell?(column: number, row: number): Cell;
  renderHeader?(column: number): Cell;
  
  style?: React.CSSProperties;

  onChanged?(event: ChangeEvent);
}

interface State {
  clientWidth?: number;
  clientHeight?: number;
  scrollLeft?: number;
  scrollTop?: number;
  selectRow?: number;
  cellWidth?: number;
}

const classes = {
  control: 'map_control',
  header: 'map_control--header',
  body: 'map_control--body',
  selectedRow: 'map_control--selected_row',
  resizeHandle: 'map_control--header--resize_handle'
};

export class MapControl extends React.Component<Props, State> {
  private map: MapRender;

  static defaultProps: Props = {
    vScroll: true,
    hScroll: true,

    width: 0,
    height: 0,

    columns: 0,
    rows: 0,

    cellWidth: 150,
    cellHeight: 30,
    cellWidthMinMax: [50, 300],

    alignedRows: false,
    selectable: false,
    resizable: false,

    renderCell: (column: number, row: number): Cell => {
      return {element: column + ':' + row};
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      scrollLeft: 0,
      scrollTop: 0,
      selectRow: 0,
      cellWidth: props.cellWidth
    };
  }

  private getScrollTop() {
    if (this.props.alignedRows)
      return Math.floor(this.state.scrollTop / this.props.cellHeight) * this.props.cellHeight;
    return this.state.scrollTop;
  }

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    let {cellHeight, alignedRows} = this.props;
    let {cellWidth} = this.state;
    
    this.setState({scrollLeft, scrollTop}, () => this.onChanged());
  };

  private onChanged() {
    if (!this.props.onChanged)
      return;

    let body = this.refs['body'] as MapRender;
    let {scrollLeft} = this.state;
    this.props.onChanged({
      scrollLeft,
      scrollTop: this.getScrollTop(),
      columns: body.getColumnsRange(),
      rows: body.getRowsRange()
    });
  }

  private onClientSize = (event) => {
    let {width, height} = event;
    this.setState({clientWidth: width, clientHeight: height}, () => this.onChanged());
  };

  scrollToRow(row: number) {
    this.setState({scrollTop: this.props.cellHeight * row});
  }

  scrollToColumn(column: number) {
    this.setState({scrollLeft: this.state.cellWidth * column});
  }

  selectRow(selectRow: number) {
    selectRow = Math.max(0, selectRow);
    selectRow = Math.min(this.props.rows - 1, selectRow);

    if (this.state.selectRow != selectRow) {
      let map = this.refs['body'] as MapRender;
      const onlyFullVisible = true;
      let rows = map.getRowsRange(onlyFullVisible);

      if (selectRow > rows[1])
        this.scrollToRow(selectRow - (rows[1] - rows[0]));

      if (selectRow < rows[0])
          this.scrollToRow(selectRow);

      this.setState({selectRow});
    }
  }

  private getTimeLimitHandler(handler: (event) => void, timePerCall: number = 100) {
    let lastTime = 0;
    return (event) => {
      let time = new Date().getTime();
      if (time - lastTime < timePerCall)
        return;
      lastTime = time;
      handler(event);
    };
  }

  private onKeyDown = this.getTimeLimitHandler((event) => {
    let {keyCode} = event;
    let selectRow = this.state.selectRow;
    if(keyCode == KeyCode.ArrowDown)
      selectRow++;

    if (keyCode == KeyCode.ArrowUp)
      selectRow--;
    
    this.selectRow(selectRow);
  });

  private onSelectCell = (column: number, row: number) => {
    this.selectRow(row);
  }

  private renderBody() {
    const {
      cellHeight,
      columns, rows,
      renderCell
    } = this.props;
    
    const {
      cellWidth,
      clientWidth, clientHeight,
      scrollLeft
    } = this.state;

    let props: MapRenderProps = {
      className: classes.body,
      ref: 'body',
      width: clientWidth,
      height: clientHeight,
      cellWidth,
      cellHeight,
      columns,
      rows,
      renderCell,
      scrollLeft,
      scrollTop: this.getScrollTop(),
      onSelectCell: this.onSelectCell
    };

    if (this.props.selectable) {
      props.onKeyDown = this.onKeyDown;
      props.tabIndex = 1;
      props.renderCell = (column: number, row: number) => {
        let cell: Cell = renderCell(column, row);
        if (row == this.state.selectRow) {
          return assign({}, cell, {className: classes.selectedRow});
        } else {
          return assign({}, cell);
        }
      };
    }

    return <MapRender {...props}/>;
  }

  getMouseRelativeTo(target: Element, event: React.MouseEvent) {
    let rect = target.getBoundingClientRect();
    return {x: event.pageX - rect.left, y: event.pageY - rect.top};
  }

  resizeColumns = (event: React.MouseEvent, column: number) => {
    if (this.props.resizable == false)
      return;

    let {cellWidth} = this.state;
    let {cellWidthMinMax} = this.props;

    let header = ReactDOM.findDOMNode(this.refs['header']);
    let point = this.getMouseRelativeTo(header as Element, event);

    startDragging({x: 0, y: 0}, {
      onDragging: (event) => {
        let cellWidth = Math.max(cellWidthMinMax[0], Math.round((event.x + point.x + this.state.scrollLeft) / (column + 1)));
        cellWidth = Math.min(cellWidth, cellWidthMinMax[1]);

        this.setState({cellWidth});
      }
    })(event as any as MouseEvent);
  }

  renderHeaderCell = (column: number): Cell => {
    let resizeHandle = this.props.resizable ? (
      <div
        onMouseDown={e => this.resizeColumns(e, column)}
        className={classes.resizeHandle}
      />
    ) : null;

    let className: string;
    let headerCell: JSX.Element | string = '' + column;
    if (this.props.renderHeader) {
      let cell = this.props.renderHeader(column);
      headerCell = cell.element;
      className = cell.className;
    }

    let element: JSX.Element = (
      <div
        className={className}
        style={{height: '100%', position: 'relative'}}>
        {resizeHandle}
        {headerCell}
      </div>
    );
    return {
      element
    };
  };

  render() {
    const {
      width, height,
      cellHeight,
      columns, rows,
      renderCell,
      alignedRows,
      vScroll,
      hScroll
    } = this.props;
    
    const {
      clientWidth, clientHeight,
      scrollLeft, scrollTop,
      cellWidth
    } = this.state;

    let contentWidth = cellWidth * columns;
    let contentHeight = cellHeight * (rows + (alignedRows ? 1 : 0));

    return (
      <div className={classes.control} style={this.props.style}>
        <MapRender
          ref = 'header'
          className = {classes.header}
          width = {clientWidth}
          height = {cellHeight}

          cellWidth = {cellWidth}
          cellHeight = {cellHeight}
          
          columns = {columns}
          rows = {1}
          
          renderCell = {this.renderHeaderCell}
          
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

          vScrollStep={alignedRows ? cellHeight : 10}
          hScrollStep={10}

          vScroll={vScroll}
          hScroll={hScroll}

          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
        >
          {this.renderBody()}
        </ScrollbarPanel>
      </div>
    );
  }
}