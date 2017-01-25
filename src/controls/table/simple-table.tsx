import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridControl} from 'controls/grid/grid-control';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {ColumnsModel, Column} from 'controls/table/columns-model';

const classes = {
  cellWrapper: 'table--cell-wrapper'
};

interface Props {
  sourceModel: TableSourceModel;
  viewModel?: GridModel;
  columnsModel?: ColumnsModel;
  wrapHeader?: (header: JSX.Element, colId: string, colIdx: number) => JSX.Element;

  header?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSelect?: (row: number) => void;
  width?: number;
  height?: number;
  focus?: boolean;

  // view model specific
  defaultSelectedRow?: number;
  defaultRowHeight?: number;
  defaultFeatures?: number; // GridModelFeatures
}

interface State {
  viewModel?: GridModel;
  columnsModel?: ColumnsModel;
}

export class Table extends React.Component<Props, State> {
  static defaultProps = {
    wrapHeader: (e: JSX.Element) => e
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      viewModel: props.viewModel || new GridModel(),
      columnsModel: props.columnsModel || new ColumnsModel()
    };

    const viewModel = this.state.viewModel;
    viewModel.setWidth(props.width);
    viewModel.setHeight(props.height);

    if (props.defaultRowHeight != null)
      viewModel.setCellHeight(props.defaultRowHeight);

    if (props.defaultFeatures != null)
      viewModel.replaceFeatures(props.defaultFeatures);

    this.props.sourceModel.getPublisher().addSubscriber(this.onSourceChanged);
    viewModel.addSubscriber(this.onViewChanged);
  }

  componentDidMount() {
    this.onSourceChanged(TableModelEvent.TOTAL);
    
    const selectedRow = this.props.defaultSelectedRow;
    if (selectedRow >= 0) {
      let viewModel = this.state.viewModel;
      viewModel.setSelectRow(selectedRow);
      viewModel.setHighlightRow(selectedRow);
      viewModel.setScrollTopRow(selectedRow);
    }
  }

  componentWillUnmount() {
    this.props.sourceModel.getPublisher().removeSubscriber(this.onSourceChanged);
    this.state.viewModel.removeSubscriber(this.onViewChanged);
  }

  componentWillReceiveProps(newProps: Props) {
    let viewModel = this.state.viewModel;
    if (newProps.viewModel != null && viewModel != newProps.viewModel) {
      viewModel = this.state.viewModel = newProps.viewModel;
    }

    if (this.props.sourceModel != newProps.sourceModel) {
      viewModel.setRows(0);
      viewModel.setColumns([]);
      newProps.sourceModel.getPublisher().moveSubscribersFrom(this.props.sourceModel.getPublisher());
    }

    viewModel.setWidth(newProps.width);
    viewModel.setHeight(newProps.height);
  }

  private updateColumnSizes() {
    const colModel = this.state.columnsModel;
    const {sourceModel} = this.props;
    const total = sourceModel.getTotal();
    const columns = Array(total.columns);
    for (let n = 0; n < columns.length; n++) {
      if (total.columns < 10) {
        columns[n] = 1;
      } else {
        columns[n] = 150;
      }

      let srcCol = sourceModel.getColumn(n);
      let col = this.state.columnsModel.getColumn(srcCol.id);
      if (col && col.width != null)
        columns[n] = col.width;
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

    // event from user column resizing
    if (eventMask & GridModelEvent.COLUMN_RESIZED) {
      const colIdx = this.state.viewModel.getResizingColumn();
      const srcCol = this.props.sourceModel.getColumn(colIdx);

      const newSize = this.state.viewModel.getColumnSize(colIdx);
      this.state.columnsModel.setColumnSize(srcCol.id, newSize);
    }

    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.props.sourceModel.loadData({cols: viewModel.getColumnsRange(), rows: viewModel.getRowsRange()});
    }
  };

  protected renderHeader = (colIdx: number) => {
    const srcCol = this.props.sourceModel.getColumn(colIdx);
    const colModel = this.state.columnsModel.getColumn(srcCol.id);

    let colValue = srcCol && srcCol.id || 'column' + colIdx;
    let element: JSX.Element;
    if (colModel && colModel.renderHeader) {
      element = this.props.wrapHeader(colModel.renderHeader(colValue, colIdx), srcCol.id, colIdx);
    } else {
      element = this.props.wrapHeader(<div>{colValue}</div>, srcCol.id, colIdx);
    }
    
    return {
      element
    };
  }

  protected renderCell = (columnIdx: number, rowIdx: number) => {
    const cell = this.props.sourceModel.getCell(columnIdx, rowIdx);
    const srcCol = this.props.sourceModel.getColumn(columnIdx);
    const colModel = this.state.columnsModel.getColumn(srcCol.id);
    if (colModel && colModel.render) {
      return {
        element: colModel.render(cell.value, cell.raw, rowIdx)
      };
    }

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
        model={this.state.viewModel}
      />
    );
  }
}