import * as React from 'react';
import {className} from 'common/common';
import {assign} from 'lodash';

const classes = {
  control: 'map_render',
  column: 'map_render--column',
  cell: 'map_render--cell',
  rightmost: 'map_render--cell_rightmost',
  lowermost: 'map_render--cell_lowermost',
  topmost: 'map_render--cell_topmost',
  leftmost: 'map_render--cell_leftmost'
};

export interface Cell {
  element: JSX.Element | string;
  className?: string;
}

export interface Props extends React.HTMLProps<any> {
  className?: string;

  width?: number;
  height?: number;

  cellWidth?: number;
  cellHeight?: number;

  columns?: number; // total cells by x
  rows?: number;  // total cells by y

  scrollLeft?: number;  // [0; cellWidth * columns - width]
  scrollTop?: number;   // [0; cellHeight * rows - height]

  renderCell?(column: number, row: number): Cell;
  onSelectCell?(column: number, row: number);
}

interface State {
}

export class MapRender extends React.Component<Props, State> {
  protected renderCell(column: number, row: number): Cell {
    if (this.props.renderCell)
      return this.props.renderCell(column, row);

    return {
      element: '' + column + ':' + row
    };
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
      
      let cell = this.renderCell(column, rowIdx);

      let cn = className(
        classes.cell,
        column == 0 && classes.leftmost,
        r == 0 && classes.topmost,
        column == this.props.columns - 1 && classes.rightmost,
        rowIdx == this.props.rows - 1 && classes.lowermost,
        cell.className
      );

      cellsArr.push(
        <div
          key={r}
          style={style}
          className={cn}
          onClick={e => this.props.onSelectCell && this.props.onSelectCell(column, rowIdx)}
        >{cell.element}</div>);
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

  getRowsRange(onlyFullVisible: boolean = false): Array<number> {
    let {offs, idx, num} = this.axisRangeRows();
    if (onlyFullVisible == true) {
      let {cellHeight, height} = this.props;

      if (offs != 0) {
        height -= cellHeight + offs;
        idx++;
      }

      num = Math.floor(height / cellHeight) - 1;
    }
    return [idx, Math.min(idx + num, this.props.rows - 1)];
  }

  render() {
    let style = {
      width: this.props.width,
      height: this.props.height
    };

    let props = assign({},
      this.props, {
      className: className(classes.control, this.props.className),
      style: assign({}, this.props.style, style)
    });

    return (
      <div {...props}>
        {this.renderColumns()}
      </div>
    );
  }
}