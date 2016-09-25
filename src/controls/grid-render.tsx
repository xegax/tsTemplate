import * as React from 'react';
import {className} from 'common/common';

const classes = {
  control: 'grid_render',
  column: 'grid_render--column',
  cell: 'grid_render--cell',
  rightmost: 'grid_render--cell_rightmost',
  lowermost: 'grid_render--cell_lowermost',
  topmost: 'grid_render--cell_topmost',
  leftmost: 'grid_render--cell_leftmost'
};

export interface Props {
  className?: string;

  width?: number;
  height?: number;

  cellHeight?: number;

  columns?: Array<number>; // total cells by x
  rows?: number;  // total cells by y

  scrollLeft?: number;  // [0; cellWidth * columns - width]
  scrollTop?: number;   // [0; cellHeight * rows - height]

  renderCell?(column: number, row: number): React.ReactInstance;
}

interface State {
  startColumn?: number;  // first visible column
  startColumnOffs?: number;
}

export class GridRender extends React.Component<Props, State> {
  static defaultProps = {
    width: 0,
    height: 0
  };

  constructor(props) {
    super(props);

    this.state = {
      startColumn: 0,
      startColumnOffs: 0
    };
  }

  componentWillReceiveProps(newProps: Props) {
    let {scrollLeft, columns} = newProps;
    let state: State = {};
    if (scrollLeft != this.props.scrollLeft || columns != this.props.columns) {
      let pos = 0;
      for(let col = 0; col < this.props.columns.length; col++) {
        if (pos > scrollLeft) {
          state.startColumn = Math.max(col - 1, 0);
          state.startColumnOffs = scrollLeft - (pos - columns[state.startColumn]);
          break;
        }
        pos += columns[col];
      }
    }

    this.setState(state);
  }

  renderCell(column: number, row: number) {
    return '' + column + ':' + row;
  }

  protected axisRange(size: number, cellSize: number, scroll: number, cells: number) {
    let idx = Math.floor(scroll / cellSize);
    let offs = scroll % cellSize || 0;
    let num = Math.ceil(size / cellSize);
    if (offs > 0)
      num++;
    
    num = Math.min(idx + num, cells) - idx;
    return {idx, offs: -offs, num};
  }

  protected axisRangeColumns() {
    let {startColumn, startColumnOffs} = this.state;
    let pos = -startColumnOffs;
    for (var num = startColumn; num <= this.props.columns.length - 1; num++) {
      if (pos > this.props.width)
        break;
      pos += this.getColumnSize(num);
    }

    return {
      idx: startColumn,
      offs: startColumnOffs,
      num: num - startColumn
    };
  }

  protected axisRangeRows() {
    return this.axisRange(this.props.height, this.props.cellHeight, this.props.scrollTop, this.props.rows);
  }

  renderColumn(column: number, c: number, rows: Array<number>) {
    let cellsArr = [];
    for (let rowIdx = rows[0]; rowIdx < rows[1]; rowIdx++) {
      let r = rowIdx - rows[0];
      let style = {
        height: this.props.cellHeight
      };
      
      let cn = className(
        classes.cell,
        column == 0 && classes.leftmost,
        r == 0 && classes.topmost,
        column == this.props.columns.length - 1 && classes.rightmost,
        rowIdx == this.props.rows - 1 && classes.lowermost
      );

      cellsArr.push(
        <div
          key={r}
          style={style}
          className={cn}
        >{this.renderCell(column, rowIdx)}</div>);
    }
    return cellsArr;
  }

  renderColumns() {
    let cols = this.axisRangeColumns();
    let rows = this.axisRangeRows();

    let colsArr = [];
    let left = this.getColumnPos(cols.idx);
    for (let colIdx = cols.idx; colIdx < cols.idx + cols.num; colIdx++) {
      let c = colIdx - cols.idx;
      let style = {
        top: rows.offs,
        left,
        width: this.getColumnSize(colIdx),
        height: this.props.height
      };
      left += this.getColumnSize(colIdx);

      let column = this.renderColumn(colIdx, c, [rows.idx, rows.idx + rows.num]);
      colsArr.push(<div key={c} style={style} className={classes.column}>{column}</div>);
    }

    return colsArr;
  }

  // relative to scrollLeft
  getColumnPos(column: number) {
    return -this.state.startColumnOffs;
  }

  getColumnSize(column: number) {
    return this.props.columns[column];
  }

  getColumnsRange(): Array<number> {
    let cols = this.axisRangeColumns();
    return [cols.idx, cols.idx + cols.num];
  }

  getRowsRange(): Array<number> {
    let rows = this.axisRangeRows();
    return [rows.idx, rows.idx + rows.num];
  }

  render() {
    let style = {
      width: this.props.width,
      height: this.props.height
    };

    return (
      <div className={className(classes.control, this.props.className)} style={style}>{this.renderColumns()}</div>
    );
  }
}