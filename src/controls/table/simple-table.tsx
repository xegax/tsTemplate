import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridControl} from 'controls/grid/grid-control';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';

const classes = {
  cellWrapper: 'table--cell-wrapper'
};

export interface Column {
  renderHeader?: (s: string, colIdx: number) => JSX.Element;
  render?: (s: string, raw: any, row: number) => JSX.Element;
  width?: number;
  label?: string;
  tooltip?: string;
}

interface Props {
  sourceModel: TableSourceModel;
  viewModel?: GridModel;

  header?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: (row: number) => void;
  selectedRow?: number;
  width?: number;
  height?: number;
  focus?: boolean;

  // view model specific
  defaultRowHeight?: number;
  defaultFeatures?: number; // GridModelFeatures
}

interface State {
  viewModel?: GridModel;
}

export class Table extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      viewModel: props.viewModel || new GridModel()
    };

    const viewModel = this.state.viewModel;
    viewModel.setWidth(props.width);
    viewModel.setHeight(props.height);

    if (props.defaultRowHeight != null)
      viewModel.setCellHeight(props.defaultRowHeight);

    if (props.defaultFeatures != null)
      viewModel.replaceFeatures(props.defaultFeatures);

    this.props.sourceModel.addSubscriber(this.onSourceChanged);
    viewModel.addSubscriber(this.onViewChanged);
  }

  componentDidMount() {
    this.onSourceChanged(TableModelEvent.TOTAL);
    if (this.props.selectedRow >= 0) {
      let viewModel = this.state.viewModel;
      viewModel.setSelectRow(this.props.selectedRow);
      viewModel.setHighlightRow(this.props.selectedRow);
      viewModel.setScrollTopRow(this.props.selectedRow);
    }
  }

  componentWillUnmount() {
    this.props.sourceModel.removeSubscriber(this.onSourceChanged);
    this.state.viewModel.removeSubscriber(this.onViewChanged);
  }

  componentWillReceiveProps(newProps: Props) {
    let viewModel = this.state.viewModel;
    if (viewModel != newProps.viewModel) {
      viewModel = this.state.viewModel = newProps.viewModel;
    }

    if (this.props.sourceModel != newProps.sourceModel) {
      viewModel.setRows(0);
      viewModel.setColumns([]);
    }

    viewModel.setWidth(newProps.width);
    viewModel.setHeight(newProps.height);
  }

  private updateColumnSizes() {
    const total = this.props.sourceModel.getTotal()
    const columns = Array(total.columns);
    for (let n = 0; n < columns.length; n++) {
      if (total.columns < 10) {
        columns[n] = 1;
      } else {
        columns[n] = 150;
      }
    }

    this.state.viewModel.setColumns(columns);
  }

  private onSourceChanged = (eventMask: number) => {
    const viewModel = this.state.viewModel;
    if (eventMask & TableModelEvent.TOTAL) {
      let total = this.props.sourceModel.getTotal();
      viewModel.setRows(total.rows);
      this.updateColumnSizes();
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.forceUpdate(() => {
        viewModel.notifySubscribers();
      });
    }
  };

  private onViewChanged = (eventMask: number) => {
    const viewModel = this.state.viewModel;
    if (eventMask & GridModelEvent.ROW_SELECT) {
      try {
        this.props.onSelect && this.props.onSelect(viewModel.getSelectRow());
      } catch(e) {
        console.log('GridModelEvent.ROW_SELECT, onSelect handler', e);
      }
    }

    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.props.sourceModel.loadData({cols: viewModel.getColumnsRange(), rows: viewModel.getRowsRange()});
    }
  };

  protected renderHeader = (colIdx: number) => {
    const column = this.props.sourceModel.getColumn(colIdx);
    return {
      element: (
        <div>
          {column && column.id || 'column' + colIdx}
        </div>
      )
    };
  }

  protected renderCell = (columnIdx: number, rowIdx: number) => {
    const cell = this.props.sourceModel.getCell(columnIdx, rowIdx);
    return {
       element: <div className={classes.cellWrapper}>{cell.value}</div> as any
    };
  }

  render() {
    return (
      <GridControl
        width={this.props.width}
        height={this.props.height}
        className={this.props.className}
        style={this.props.style}
        header={this.props.header}
        resizable
        focus={this.props.focus}
        renderCell={this.renderCell}
        renderHeader={this.renderHeader}
        model={this.props.viewModel}
      />
    );
  }
}