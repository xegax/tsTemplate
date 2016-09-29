import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {MapRender, Props as MapRenderProps, Cell} from 'controls/map-render';
import {ScrollbarPanel} from 'controls/scrollbar-panel';
import {KeyCode} from 'common/keycode';
import {startDragging} from 'common/start-dragging';

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

  aligned?: boolean;
  selectable?: boolean;
  resizable?: boolean;
  renderCell?(column: number, row: number): Cell;
  
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
  selectedRow: 'map_control--selected_row'
};

const resizeHandleSize = 5;

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
    cellWidthMinMax: [50, 300],

    aligned: false,
    selectable: true,
    resizable: true,

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

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    let {cellHeight, aligned} = this.props;
    let {cellWidth} = this.state;
    
    if (aligned) {
      scrollTop = Math.floor(scrollTop / cellHeight) * cellHeight;
      scrollLeft = Math.floor(scrollLeft / cellWidth) * cellWidth;
    }
    
    this.setState({scrollLeft, scrollTop});
    this.onChanged();
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
    this.onChanged();
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
      scrollLeft, scrollTop
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
      scrollTop,
      onSelectCell: this.onSelectCell
    };

    if (this.props.selectable) {
      props.onKeyDown = this.onKeyDown;
      props.tabIndex = 1;
      props.renderCell = (column: number, row: number) => {
        let cell: Cell = {element: [column, row].join(':')};
        if (row == this.state.selectRow)
          cell.className = classes.selectedRow;
        return cell;
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
    let element: JSX.Element = (
      <div style={{height: '100%', position: 'relative'}}>
        <div
          onMouseDown={e => this.resizeColumns(e, column)}
          style={{position: 'absolute', height: '100%', width: resizeHandleSize, right: 0, cursor: 'w-resize'}}
        />
        {column}
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
      aligned,
      vScroll,
      hScroll
    } = this.props;
    
    const {
      clientWidth, clientHeight,
      scrollLeft, scrollTop,
      cellWidth
    } = this.state;

    let contentWidth = cellWidth * (columns + (aligned ? 1 : 0));
    let contentHeight = cellHeight * (rows + (aligned ? 1 : 0));

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

          vScrollStep={aligned ? cellHeight : 10}
          hScrollStep={aligned ? cellWidth : 10}

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