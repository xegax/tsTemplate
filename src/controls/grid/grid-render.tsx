import * as React from 'react';
import {className} from 'common/common';
import {GridModel, GridModelFeatures} from 'controls/grid/grid-model';
import {KeyCode} from 'common/keycode';

const classes = {
  control: 'grid_render',
  column: 'grid_render--column',
  cell: 'grid_render--cell',
  rightmost: 'grid_render--cell_rightmost',
  lowermost: 'grid_render--cell_lowermost',
  topmost: 'grid_render--cell_topmost',
  leftmost: 'grid_render--cell_leftmost',
  selectRow: 'grid_render--cell_select_row',
  selectCell: 'grid_render--cell-select',
  hoverRow: 'grid_render--hover_row'
};

export interface Cell {
  element: JSX.Element | string;
  className?: string;
}

export interface Props {
  className?: string;
  model?: GridModel;

  width?: number;
  height?: number;

  renderCell?(column: number, row: number): Cell;
}

interface State {
}

export class GridRender extends React.Component<Props, State> {
  static defaultProps: Props = {
    width: 0,
    height: 0,
    renderCell: (c, r) => ({element: [c, r].join(':')})
  };

  constructor(props: Props) {
    super(props);
    this.state = {
    };
    props.model.addSubscriber(this.onModelChanged);
  }

  componentWillUnmount() {
    this.props.model.removeSubscriber(this.onModelChanged);
  }

  private onModelChanged = (eventMask) => {
    this.forceUpdate();
  }

  componentWillReceiveProps(newProps: Props) {
    let {model} = newProps;

    if (this.props.model != model) {
      this.props.model.removeSubscriber(this.onModelChanged);
      model.addSubscriber(this.onModelChanged);
    }

    model.setWidth(newProps.width);
    model.setHeight(newProps.height);
  }

  private getRows() {
    return this.props.model.getRows();
  }

  renderColumn(column: number, c: number, rows: Array<number>) {
    let columnsNum = this.props.model.getColumnsNum();
    let rowsNum = this.getRows();
    let cellHeight = this.props.model.getCellHeight();

    let cellsArr = [];
    for (let rowIdx = rows[0]; rowIdx < rows[1]; rowIdx++) {
      let r = rowIdx - rows[0];
      let style = {
        height: cellHeight
      };

      let cell = this.props.renderCell(column, rowIdx);
      const isRowSelect = this.props.model.isRowSelect(rowIdx);
      const isSelectCell = this.props.model.isCellSelect(column, rowIdx);
      let cn = className(
        classes.cell,
        column == 0 && classes.leftmost,
        r == 0 && classes.topmost,
        column == columnsNum - 1 && classes.rightmost,
        rowIdx == rowsNum - 1 && classes.lowermost,
        isRowSelect && !isSelectCell && classes.selectRow,
        cell && cell.className,
        this.props.model.getHighlightRow() == rowIdx && classes.hoverRow,
        isSelectCell && classes.selectCell
      );

      cellsArr.push(
        <div
          key={r}
          style={style}
          className={cn}
          onClick={e => {
            if (!e.ctrlKey || !this.props.model.hasFeatures(GridModelFeatures.ROWS_MULTI_SELECT))
              this.props.model.clearRowSelect();
            this.props.model.setRowSelect(rowIdx, true);
            this.props.model.setSelectColumn(column, true);
          }}
          onContextMenu={e => {
            if (!e.ctrlKey || !this.props.model.hasFeatures(GridModelFeatures.ROWS_MULTI_SELECT))
              this.props.model.clearRowSelect();
            this.props.model.setRowSelect(rowIdx, true);
            this.props.model.setSelectColumn(column, true);
          }}
          onMouseEnter={e => e.buttons == 0 && this.props.model.setHighlightRow(rowIdx)}
          onMouseMove={e => e.buttons == 0 && this.props.model.setHighlightRow(rowIdx)}
          onWheel={this.onWheel}
        >
          {cell.element}
        </div>
      );
    }
    return cellsArr;
  }

  renderColumns() {
    let {model} = this.props;
    let cols = model.getAxisRangeColumns();
    let rows = model.getAxisRangeRows();

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
    return -this.props.model.getStartColumnOffs();
  }

  getColumnSize(column: number) {
    return this.props.model.getColumnSize(column);
  }

  getColumnsRange(): Array<number> {
    let cols = this.props.model.getAxisRangeColumns();
    return [cols.idx, cols.idx + cols.num];
  }

  getRowsRange(): Array<number> {
    let rows = this.props.model.getAxisRangeRows();
    return [rows.idx, Math.min(rows.idx + rows.num, this.getRows() - 1)];
  }

  onWheel = (event: React.WheelEvent<HTMLElement>) => {
    let [topRow] = this.props.model.getRowsRange();
    if(event.deltaY < 0)
      topRow -= 1;
    else
      topRow += 1;
    this.props.model.setScrollTopRow(topRow);
    event.preventDefault();
  };

  onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    let row = this.props.model.getSelectRow();
    let col = this.props.model.getSelectColumn();

    if (event.keyCode == KeyCode.ArrowUp) {
      row--;
    }

    if (event.keyCode == KeyCode.ArrowDown) {
      row++;
    }

    if (event.keyCode == KeyCode.ArrowLeft) {
      col--;
    }

    if (event.keyCode == KeyCode.ArrowRight) {
      col++;
    }
    
    this.props.model.setRowSelect(row);
    this.props.model.setSelectColumn(col);
  }

  render() {
    let style = {
      width: this.props.width,
      height: this.props.height
    };
    const selectable = this.props.model.hasFeatures(GridModelFeatures.CELLS_SELECTABLE | GridModelFeatures.ROWS_SELECTABLE);

    return (
      <div
        tabIndex={selectable ? 1 : null}
        className={className(classes.control, this.props.className)}
        style={style}
        onKeyDown={this.onKeyDown}
        onMouseLeave={e => this.props.model.setHighlightRow(-1)}
      >
        {this.renderColumns()}
      </div>
    );
  }
}
