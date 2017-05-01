import * as React from 'react';
import {Table, WrapCell} from './simple-table';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableData, TableParams} from 'table/table-data';
import {ColumnsModel} from './columns-model';
import {Appearance} from 'common/appearance';
import {Publisher} from 'common/publisher';
import {SortColumn, SortDir} from 'common/table';
import {Menu, MenuItem} from 'controls/menu';
import {className} from 'common/common';
import {FilterModel} from 'controls/filter/filter-model';
import {FilterCondition, CompoundCondition} from 'table/filter-condition';
import {assign} from 'lodash';

const classes = {
  headerWrapper: 'table-header-wrapper',
  headerLabel: 'table-header-wrapper__label',
  hover: 'hover',
  sorted: 'sorted'
};

interface Props {
  width?: number;
  height?: number;
  defaultFeatures?: number;

  model?: ExtTableModel;
  tableData: TableData;
  viewModel?: GridModel;
  columns?: ColumnsModel;
  appr?: Appearance;
  
  wrapHeader?(header: JSX.Element, column: string, colIdx: number);
  wrapCell?(params: WrapCell);
  getColumMenu?(column: string, colIdx: number, model: ExtTableModel): Array<MenuItem>;
  onTableChanged?: (tableData: TableData) => void;
  onSelect?: (row: number, table: TableData) => void;
  key?: string | number;
}

interface State {
  tableData?: TableData;
  columnsData?: TableData;
  viewModel?: GridModel;
  columns?: ColumnsModel;
  model?: ExtTableModel;
  ctxMenuColumn?: string;
}


export class ExtTableModel extends Publisher {
  static readonly SortingEvent = 1;
  static readonly FilterEvent = 1 << 1;

  private sorting = Array<SortColumn>();
  private textFilter: {text: string, column: string} = {text: null, column: null};
  private filter = new FilterModel();

  constructor() {
    super();

    this.filter.addSubscriber((mask) => {
      this.updateVersion(ExtTableModel.FilterEvent, 1);
    });
  }

  clearSorting() {
    if (this.sorting.length == 0)
      return;

    this.sorting.splice(0, this.sorting.length);
    this.updateVersion(ExtTableModel.SortingEvent, 1);
  }

  addSorting(column: string, dir: SortDir) {
    let idx;
    for (let n = 0; n < this.sorting.length; n++) {
      if (this.sorting[n].column != column)
        continue;
      
      if (this.sorting[n].dir == dir)
        return;

      idx = n;
      break;
    }

    if (idx == null) {
      this.sorting.push({column, dir});
    } else {
      if (dir != SortDir.natural) {
        this.sorting[idx] = {column, dir};
      } else {
        this.sorting.splice(idx, 1);
      }
    }

    this.updateVersion(ExtTableModel.SortingEvent, 1);
  }

  getColumnSorting(column: string): SortDir {
    for (let n = 0; n < this.sorting.length; n++) {
      if (this.sorting[n].column == column) {
        return this.sorting[n].dir;
      }
    }

    return SortDir.natural;
  }

  getSorting(): Array<SortColumn> {
    return this.sorting;
  }

  getTableParams(): TableParams {
    return {
      sort: this.getSorting(),
      filter: this.getFilterCondition()
    };
  }

  getTextFilter() {
    return assign({}, this.textFilter);
  }

  setTextFilter(args: {text?: string, column?: string}) {
    let update = 0;
    if ('text' in args && args.text != this.textFilter.text) {
      this.textFilter.text = args.text;
      this.updateVersion(ExtTableModel.FilterEvent, 1);
    }

    if ('column' in args && args.column != this.textFilter.column) {
      this.textFilter.column = args.column;
    }
  }

  private getFilterCondition(): FilterCondition {
    if (!this.textFilter.text || !this.textFilter.column)
      return null;
    
    const compCond: CompoundCondition = {
      condition: [
        {
          textValue: this.textFilter.text,
          column: this.textFilter.column
        }
      ],
      op: 'and'
    };
    
    const cond = this.filter.makeCondition();
    if (cond)
      compCond.condition.push(cond);

    return compCond;
  }
}

export class ExtTable extends React.Component<Props, State> {
  static defaultProps = {
    wrapHeader: (header) => header,
    wrapCell: (params: WrapCell) => params.element,
    getColumMenu: () => null
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      tableData: props.tableData,
      columnsData: props.tableData ? props.tableData.getColumns() : null,
      viewModel: props.viewModel || new GridModel(),
      columns: props.columns || new ColumnsModel(null),
      model: this.props.model || new ExtTableModel()
    };
  }

  onModelChanged = (mask: number) => {
    if (mask & (ExtTableModel.SortingEvent | ExtTableModel.FilterEvent)) {
      const params = this.state.model.getTableParams();
      this.state.tableData.setParams(params)
        .then(tableData => {
          this.props.onTableChanged && this.props.onTableChanged(tableData);
          this.setState({tableData});
        });
    }
    this.forceUpdate();
  }

  componentDidMount() {
    this.state.model.addSubscriber(this.onModelChanged);
  }

  componentWillUnmount() {
    this.state.model.removeSubscriber(this.onModelChanged);
  }

  componentWillReceiveProps(newProps: Props) {
    let state: State = {};

    if (newProps.tableData != this.props.tableData) {
      state.tableData = newProps.tableData;
    }

    if (newProps.viewModel != this.props.viewModel) {
      state.viewModel = newProps.viewModel;
    }
    
    if (newProps.columns != this.props.columns) {
      state.columns = newProps.columns;
    }

    if (Object.keys(state).length != 0)
      this.setState(state);
  }

  protected wrapHeader = (header: JSX.Element, column: string, colIdx: number) => {
    const model = this.state.model;
    const items = this.props.getColumMenu(column, colIdx, model) || [
      {
        label: 'sort asc',
        command: () => {
          model.clearSorting();
          model.addSorting(column, SortDir.asc);
        }
      }, {
        label: 'sort desc',
        command: () => {
          model.clearSorting();
          model.addSorting(column, SortDir.desc);
        }
      }, {
        label: 'sort natural',
        command: () => {
          model.addSorting(column, SortDir.natural);
        }
      }
    ];
    const onContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      Menu.showAt({x: event.pageX, y: event.pageY}, 
        <Menu
          items={items}
          onShow={(show: boolean) => {
            this.setState({ctxMenuColumn: !show ? null : column});
          }
        }/>
      );
    };

    const onClickBy = (event: React.MouseEvent) => {
      event.stopPropagation();
      Menu.showUnder(event.currentTarget as HTMLElement,
        <Menu
          items={items}
          onShow={(show: boolean) => {
            this.setState({ctxMenuColumn: !show ? null : column});
          }}
        />
      );
    };

    let icon = (
      <i
        className='fa fa-bars'
        onMouseDown={onClickBy}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    );

    let sort = this.state.model.getColumnSorting(column);
    if (sort == SortDir.asc) {
      icon = <i className='fa fa-sort-amount-asc' onMouseDown={onClickBy}/>;
    } else if (sort == SortDir.desc) {
      icon = <i className='fa fa-sort-amount-desc' onMouseDown={onClickBy}/>;
    }

    return (
      <div
        className={
          className(
            classes.headerWrapper,
            this.state.ctxMenuColumn == column && classes.hover,
            sort != SortDir.natural && classes.sorted
          )}
        title={column}
        onContextMenu={onContextMenu}>
          <div className={classes.headerLabel}>{this.props.wrapHeader(header, column, colIdx)}</div>
          {icon}
      </div>
    );
  }

  protected wrapCell = (params: WrapCell) => {
    const onCellContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
    }

    return (
      <div onContextMenu={onCellContextMenu} style={{height: '100%'}}>
        {this.props.wrapCell(params)}
      </div>
    );
  }

  protected renderTable() {
    return (
      <Table
        width={this.props.width}
        height={this.props.height}
        defaultFeatures={this.props.defaultFeatures}

        key={this.props.key}
        defaultRowHeight={40}
        viewModel={this.state.viewModel}
        columnsModel={this.state.columns}
        tableData={this.state.tableData}
        wrapHeader={this.wrapHeader}
        onSelect={row => this.props.onSelect && this.props.onSelect(row, this.state.tableData)}
        wrapCell={this.wrapCell}
      />
    );
  }

  render() {
    if (!this.state.tableData)
      return <div>No data to display</div>;

    return this.renderTable();
  }
}