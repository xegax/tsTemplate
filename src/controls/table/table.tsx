import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridControl} from 'controls/grid/grid-control';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableSourceModel, TableModelEvent, ColumnType} from 'model/table-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';
import {KeyCode} from 'common/keycode';
import {Timer} from 'common/timer';
import {Filterable, CompoundCondition, ColumnCondition, ConditionCat, ConditionText} from 'model/filter-condition';
import {TextFilter} from 'controls/table/text-filter';
import {CatFilter} from 'controls/table/cat-filter';

export type ColumnsMap = {[column: string]: Column};

export interface Column {
  renderHeader?: (s: string, colIdx: number) => JSX.Element;
  render?: (s: string, raw: any, row: number) => JSX.Element;
  width?: number;
  tempWidth?: number;
  label?: string;
  tooltip?: string;
}

interface Props {
  sourceModel: TableSourceModel;
  viewModel?: GridModel;
  columnsMap?: ColumnsMap;

  header?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: (row: number) => void;
  selectedRow?: number;
  width?: number;
  height?: number;
  focus?: boolean;
  highlightableRows?: boolean;
  rowHeight?: number;
}

interface State {
  filterCol?: number;
  columnConditions?: {[column: string]: CompoundCondition | ColumnCondition};
}

export class Table extends React.Component<Props, State> {
  static defaultProps = {
    columnRender: [],
    highlightableRows: false,
    rowHeight: 30
  };

  private sourceModel: TableSourceModel;
  private viewModel: GridModel;

  constructor(props: Props) {
    super(props);
    this.state = {filterCol: -1, columnConditions: {}};

    this.viewModel = props.viewModel || new GridModel();
    this.viewModel.setWidth(props.width);
    this.viewModel.setHeight(props.height);
    this.viewModel.setCellHighlightable(this.props.highlightableRows === true);
    this.viewModel.setCellHeight(this.props.rowHeight);

    this.sourceModel = this.props.sourceModel;
    this.sourceModel.addSubscriber(this.onSourceChanged);
    this.viewModel.addSubscriber(this.onViewChanged);

    this.viewModel.setCellSelectable(true);
  }

  componentDidMount() {
    this.onSourceChanged(TableModelEvent.TOTAL);
    if (this.props.selectedRow >= 0) {
      this.viewModel.setSelectRow(this.props.selectedRow);
      this.viewModel.setHighlightRow(this.props.selectedRow);
      this.viewModel.setScrollTopRow(this.props.selectedRow);
    }
  }

  componentWillUnmount() {
    this.sourceModel.removeSubscriber(this.onSourceChanged);
    this.viewModel.removeSubscriber(this.onViewChanged);
  }

  private getColumn(colId: string): Column {
    return this.props.columnsMap && this.props.columnsMap[colId];
  }

  private updateColumnSizes() {
    let total = this.sourceModel.getTotal()
    let columns = Array(total.columns);
    for (let n = 0; n < columns.length; n++) {
      if (total.columns < 10) {
        columns[n] = 1;
      } else {
        columns[n] = 150;
      }

      let col = this.sourceModel.getColumn(n);
      let colInfo = this.getColumn(col.id);
      if (!colInfo)
        continue;
        
      if (colInfo.tempWidth != null)
        columns[n] = colInfo.tempWidth;
      else if (colInfo.width != null)
        columns[n] = colInfo.width;
    }

    this.viewModel.setColumns(columns);
  }

  private onSourceChanged = (eventMask: number) => {
    if (eventMask & TableModelEvent.TOTAL) {
      let total = this.sourceModel.getTotal();
      this.viewModel.setRows(total.rows);
      this.updateColumnSizes();
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.forceUpdate(() => {
        this.viewModel.notifySubscribers();
      });
    }
  };

  private onViewChanged = (eventMask: number) => {
    if (eventMask & GridModelEvent.ROW_SELECT) {
      try {
        this.props.onSelect && this.props.onSelect(this.viewModel.getSelectRow());
      } catch(e) {
        console.log('GridModelEvent.ROW_SELECT, onSelect handler', e);
      }
    }

    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.sourceModel.loadData({cols: this.viewModel.getColumnsRange(), rows: this.viewModel.getRowsRange()});
    }
  };

  componentWillReceiveProps(newProps: Props) {
    if (this.props.sourceModel != newProps.sourceModel) {
      this.sourceModel = newProps.sourceModel;
      this.viewModel.setRows(0);
      this.viewModel.setColumns([]);
    }

    this.viewModel.setWidth(newProps.width);
    this.viewModel.setHeight(newProps.height);
  }

  renderCell = (columnIdx: number, rowIdx: number) => {
    let cell = this.sourceModel.getCell(columnIdx, rowIdx);
    let col = this.sourceModel.getColumn(columnIdx);
    
    if (cell.raw != null) {
      const colInfo = this.getColumn(col.id);
      if (colInfo && colInfo.render)
        return {
          element: colInfo.render(cell.value, cell.raw, rowIdx)
        };
    }

    return {
       element: <div style={{padding: 3, whiteSpace: 'nowrap', textOverflow: 'inherit', overflow: 'hidden'}}>{cell.value}</div> as any
    };
  }

  onColumnFilter(column: number) {
    if (column != -1) {
      let {id} = this.sourceModel.getColumn(column);
      let colInfo = this.getColumn(id);
      if (colInfo && this.viewModel.getColumnSize(column) < 200) {
        colInfo.tempWidth = 200;
        this.updateColumnSizes();
      }
    } else if (this.state.filterCol != -1) {
      let {id} = this.sourceModel.getColumn(this.state.filterCol);
      let colInfo = this.getColumn(id);
      if (colInfo) {
        colInfo.tempWidth = null;
        this.updateColumnSizes();
      }
    }
    this.setState({filterCol: column});
  }

  private setColumnCondition(colId: string, cond: CompoundCondition | ColumnCondition) {
    let colCondMap = this.state.columnConditions;
    colCondMap[colId] = cond;
    
    let ccond: CompoundCondition = {op: 'and', condition: []};
    ccond.condition = Object.keys(colCondMap).map(colId => {
      return colCondMap[colId];
    });
    this.sourceModel.setConditions(ccond);
  }

  renderHeader = (column: number) => {
    let {id, type} = this.sourceModel.getColumn(column);
    let colInfo = this.getColumn(id);
    let tooltip = colInfo && colInfo.tooltip || undefined;
    if (this.state.filterCol == column) {
      if (type == ColumnType.cat) {
        return {
          element: (
            <CatFilter
              column={id}
              condition={this.state.columnConditions[id] as ConditionCat}
              applyCondition={cond => this.setColumnCondition(id, cond)}
              source={this.sourceModel}
              onClose={() => this.onColumnFilter(-1)}
            />)
        };
      } else {
        return {
          element: (
            <TextFilter
              column={id}
              condition={this.state.columnConditions[id] as ConditionText}
              applyCondition={cond => this.setColumnCondition(id, cond)}
              source={this.sourceModel}
              onClose={() => this.onColumnFilter(-1)}
            />)
        };
      }
    }
    
    if (colInfo && colInfo.renderHeader) {
      return {
        element: colInfo.renderHeader(id, column)
      };
    }

    return {
      element: <div onDoubleClick={e => this.onColumnFilter(column)} title={tooltip}>{colInfo && colInfo.label || id}</div>
    };
  }

  renderGridControl() {
    return (
      <GridControl
        width={this.props.width}
        height={this.props.height}
        className={this.props.className}
        ref='grid'
        style={this.props.style}
        header={this.props.header}
        resizable
        focus={this.props.focus}
        renderCell={this.renderCell}
        renderHeader={this.renderHeader}
        model={this.viewModel}
      />
    );
  }

  render() {
    return this.renderGridControl();
  }
}