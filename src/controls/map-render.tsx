import * as React from 'react';
import {className} from 'common/common';

const classes = {
  control: 'map_render',
  column: 'map_render--column',
  cell: 'map_render--cell',
  rightmost: 'map_render--cell_rightmost',
  lowermost: 'map_render--cell_lowermost',
  topmost: 'map_render--cell_topmost',
  leftmost: 'map_render--cell_leftmost'
};

interface Props {
  className?: string;

  width?: number;
  height?: number;

  cellWidth?: number;
  cellHeight?: number;

  columns?: number; // total cells by x
  rows?: number;  // total cells by y

  scrollLeft?: number;  // [0; cellWidth * columns - width]
  scrollTop?: number;   // [0; cellHeight * rows - height]

  renderCell?(column: number, row: number): React.ReactInstance;
}

interface State {
}

export class MapRender extends React.Component<Props, State> {
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
    return this.axisRange(this.props.width, this.props.cellWidth, this.props.scrollLeft, this.props.columns);
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
        column == this.props.columns - 1 && classes.rightmost,
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
        width: this.props.cellWidth,
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
    return -(this.props.scrollLeft % this.props.cellWidth) || 0;
  }

  getColumnSize(column: number) {
    return this.props.cellWidth;
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