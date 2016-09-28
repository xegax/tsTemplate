import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {MapRender, Props as MapRenderProps, Cell} from 'controls/map-render';
import {ScrollbarPanel} from 'controls/scrollbar-panel';
import {KeyCode} from 'common/keycode';

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
  cellHeight?: number;

  aligned?: boolean;
  selectable?: boolean;
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
}

const classes = {
  control: 'map_control',
  header: 'map_control--header',
  body: 'map_control--body',
  selectedRow: 'map_control--selected_row'
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
    selectable: true,

    renderCell: (column: number, row: number): Cell => {
      return {element: column + ':' + row};
    }
  };

  constructor(props) {
    super(props);
    this.state = {
      scrollLeft: 0,
      scrollTop: 0,
      selectRow: 0
    };
  }

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    let {cellWidth, cellHeight, aligned} = this.props;
    
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
    this.setState({scrollLeft: this.props.cellWidth * column});
  }

  private onKeyDown = (event) => {
    let {keyCode} = event;
    
    let map = this.refs['body'] as MapRender;
    const onlyFullVisible = true;
    let rows = map.getRowsRange(onlyFullVisible);

    let selectRow = this.state.selectRow;
    
    if(keyCode == KeyCode.ArrowDown)
      selectRow = Math.min(this.props.rows - 1, selectRow + 1);

    if (keyCode == KeyCode.ArrowUp)
      selectRow = Math.max(0, selectRow - 1);  

    if (selectRow > rows[1])
        this.scrollToRow(selectRow - (rows[1] - rows[0]));

    if (selectRow < rows[0])
        this.scrollToRow(selectRow);

    if (selectRow != this.state.selectRow)
      this.setState({selectRow});
  }

  private renderBody() {
    const {
      cellWidth, cellHeight,
      columns, rows,
      renderCell
    } = this.props;
    
    const {
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
      scrollTop
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
      <div className={classes.control} style={this.props.style}>
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

          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
        >
          {this.renderBody()}
        </ScrollbarPanel>
      </div>
    );
  }
}