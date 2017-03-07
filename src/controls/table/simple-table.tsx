import * as React from 'react';
import {GridControl} from 'controls/grid/grid-control';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {ColumnsModel} from 'controls/table/columns-model';
import {TableData} from 'table/table-data';

const classes = {
  cellWrapper: 'table--cell-wrapper'
};

interface Props {
  tableData: TableData;
  viewModel?: GridModel;
  columnsModel?: ColumnsModel;
  wrapHeader?: (header: JSX.Element, colId: string, colIdx: number) => JSX.Element;
  wrapCell?: (cell: JSX.Element, colId: string, colIdx: number, row: number) => JSX.Element;

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
  tableData?: TableData;
  columnsData?: TableData;
  viewModel?: GridModel;
  columnsModel?: ColumnsModel;
}

export class Table extends React.Component<Props, State> {
  static defaultProps = {
    wrapHeader: (e: JSX.Element) => e,
    wrapCell: (e: JSX.Element, colId: string, colIdx: number, row: number) => e
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      tableData: props.tableData,
      viewModel: props.viewModel || new GridModel(),
      columnsData: props.tableData.getColumns(),
      columnsModel: props.columnsModel || new ColumnsModel()
    };

    const viewModel = this.state.viewModel;
    viewModel.setWidth(props.width);
    viewModel.setHeight(props.height);
    viewModel.setRows(this.state.tableData.getInfo().rowNum);
    this.updateColumnSizes(this.state.tableData);

    if (props.defaultRowHeight != null)
      viewModel.setCellHeight(props.defaultRowHeight);

    if (props.defaultFeatures != null)
      viewModel.replaceFeatures(props.defaultFeatures);

    this.state.viewModel.addSubscriber(this.onViewChanged);
  }

  componentDidMount() {
    const selectedRow = this.props.defaultSelectedRow;
    if (selectedRow >= 0) {
      let viewModel = this.state.viewModel;
      viewModel.setSelectRowSilent(selectedRow);
      viewModel.setHighlightRow(selectedRow);
      viewModel.setScrollTopRow(selectedRow);
    }
  }

  componentWillUnmount() {
    this.state.viewModel.removeSubscriber(this.onViewChanged);
  }

  componentWillReceiveProps(newProps: Props) {
    let {viewModel} = this.state;
    if (newProps.viewModel != null && viewModel != newProps.viewModel) {
      viewModel = newProps.viewModel;
      this.setState({viewModel});
    }

    if (this.props.tableData != newProps.tableData) {
      viewModel.setRows(0);
      viewModel.setColumns([]);

      this.updateColumnSizes(newProps.tableData);
      viewModel.setRows(newProps.tableData.getInfo().rowNum);
      this.setState({tableData: newProps.tableData, columnsData: newProps.tableData.getColumns()});
    }

    viewModel.setWidth(newProps.width);
    viewModel.setHeight(newProps.height);
  }

  private updateColumnSizes(tableData: TableData) {
    const {columnsModel, columnsData} = this.state;
    const info = tableData.getInfo();

    const columnSize = Array(info.colNum);
    for (let n = 0; n < columnSize.length; n++) {
      if (info.colNum < 10) {
        columnSize[n] = 1;
      } else {
        columnSize[n] = 150;
      }

      const column = columnsData.getCell(0, n);
      let col = columnsModel.getColumn(column.text);
      if (col && col.width != null)
        columnSize[n] = col.width;
    }

    this.state.viewModel.setColumns(columnSize);
  }

  private onViewChanged = (eventMask: number) => {
    const {viewModel, tableData, columnsModel, columnsData} = this.state;
    if (!columnsData || !tableData)
      return;

    if (eventMask & GridModelEvent.ROW_SELECT) {
      try {
        this.props.onSelect && this.props.onSelect(viewModel.getSelectRow());
      } catch (e) {
        console.log('GridModelEvent.ROW_SELECT, onSelect handler', e);
      }
    }

    // event from user column resizing
    if (eventMask & GridModelEvent.COLUMN_RESIZED) {
      const colIdx = viewModel.getResizingColumn();
      const colSize = viewModel.getColumnSize(colIdx);
      const column = columnsData.getCell(colIdx, 0);
      columnsModel.setColumnSize(column.text, colSize);
    }

    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      const {viewModel} = this.state;
      this.state.tableData.selectData(viewModel.getRowsRange(), viewModel.getColumnsRange()).then((d) => {
        this.forceUpdate();
      });
    }
  };

  protected renderHeader = (colIdx: number) => {
    const {tableData, columnsModel, columnsData} = this.state;
    const column = columnsData.getCell(colIdx, 0);
    const colModel = columnsModel.getColumn(column.text);
    const colName = column && column.text || 'column-' + colIdx;
    let element: JSX.Element;

    if (colModel && colModel.renderHeader) {
      element = this.props.wrapHeader(colModel.renderHeader(colName, colIdx), colName, colIdx);
    } else {
      element = this.props.wrapHeader(<div>{colName}</div>, colName, colIdx);
    }

    return {
      element
    };
  }

  protected renderCell = (columnIdx: number, rowIdx: number) => {
    const {tableData, columnsModel, columnsData} = this.state;
    const cell = tableData.getCell(rowIdx, columnIdx);
    const column = columnsData.getCell(columnIdx, 0);
    const colModel = columnsModel.getColumn(column.text);

    let element: JSX.Element;
    if (colModel && colModel.render) {
      element = colModel.render(cell.text, cell.raw, rowIdx);
    } else {
      element = <div className={classes.cellWrapper}>{cell.text}</div>;
    }

    return {
      element: this.props.wrapCell(element, column.text, columnIdx, rowIdx)
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