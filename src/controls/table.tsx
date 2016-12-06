import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridControl} from 'controls/grid/grid-control';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';

export interface Column {
  render?: (s: string, raw: any, row: number) => JSX.Element;
  width?: number;
  label?: string;
  tooltip?: string;
}

interface Props {
  sourceModel: TableSourceModel;
  viewModel?: GridModel;
  columnsMap?: {[column: string]: Column};

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
    this.state = {};

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

  private onSourceChanged = (eventMask: number) => {
    if (eventMask & TableModelEvent.TOTAL) {
      let total = this.sourceModel.getTotal();
      this.viewModel.setRows(total.rows);

      let columns = Array(total.columns);
      for (let n = 0; n < columns.length; n++) {
        if (total.columns < 10) {
          columns[n] = 1;
        } else {
          columns[n] = 150;
        }

        let col = this.sourceModel.getColumn(n);
        let colInfo = this.getColumn(col.id);
        if (colInfo && colInfo.width != null)
          columns[n] = colInfo.width;
      }

      this.viewModel.setColumns(columns);
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.forceUpdate(() => {
        this.viewModel.notifySubscribers();
      });
    }
  };

  private onViewChanged = (eventMask: number) => {
    if (eventMask & GridModelEvent.ROW_SELECT) {
      this.props.onSelect && this.props.onSelect(this.viewModel.getSelectRow());
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

  renderHeader = (column: number) => {
    let id = this.sourceModel.getColumn(column).id;
    let colInfo = this.getColumn(id);
    let tooltip = colInfo && colInfo.tooltip || undefined;
    return {
      element: <div title={tooltip}>{colInfo && colInfo.label || id}</div>
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