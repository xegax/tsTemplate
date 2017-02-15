import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {DataRange, SortDir, TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONServerSourceModel} from 'model/json-server-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {TestTableSourceModel,} from 'model/test-table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table/simple-table';
import {assign} from 'lodash';
import {ColumnsModel} from 'controls/table/columns-model';
import {AppearanceFromLocalStorage, Appearance} from 'common/appearance';
import {Menu} from 'controls/menu';
import {Timer} from 'common/timer';
import {Dialog} from 'controls/dialog';
import {FilterPanel} from 'controls/filter/filter-panel';
import {FilterModel} from 'controls/filter/filter-model';
import {ComboBox} from 'controls/combobox';
import {KeyCode} from 'common/keycode';
import {CompoundCondition} from 'model/filter-condition';

interface State {
  listItem?: number;
  data?: any;
  view?: GridModel;
  model?: TableSourceModel;
  columns?: ColumnsModel;
  appr?: Appearance;
  hoverColumn?: string;
  status?: string;
  filter?: FilterModel;
  columnsSource?: TableSourceModel;
  textFilterColumn?: string;
  textFilter?: string;
}

interface Props {
  list: Array<string>;
}

const classes = {
  headerWrapper: 'table-header-wrapper',
  headerLabel: 'table-header-wrapper__label',
  hover: 'hover',
  sorted: 'sorted'
};

class DataSelector extends React.Component<Props, State> {
  private updateStatus = new Timer(() => {
    let total = this.state.model.getTotal();
    let range = this.state.view.getRowsRange();
    let status = `total rows: ${total.rows}, start row: ${range[0]}`;
    if (this.state.status != status)
      this.setState({status});
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      listItem: 5,
      view: new GridModel(),
      filter: new FilterModel()
    };

    this.state.appr = this.createAppearance(this.state.listItem);
    this.state.columns = this.createColumnsModel(this.state.appr, this.state.listItem);
    this.state.model = this.createModel(this.state.appr, this.state.listItem);
    
    this.state.model.getPublisher().addSubscriber((mask) => {
      if (!(mask & TableModelEvent.TOTAL))
        return;

      if (!this.updateStatus.isRunning())
        this.updateStatus.run(1000);
      
      let total = this.state.model.getTotal();
      let columns = [];
      for (let n = 0; n < total.columns; n++) {
        columns.push(this.state.model.getColumn(n));
      }

      let json = new JSONSourceModel(columns.map(col => [col.id]), ['name']);
      if (this.state.columnsSource)
        json.getPublisher().moveSubscribersFrom(this.state.columnsSource.getPublisher());

      this.setState({columnsSource: json});
    });

    this.state.view.addSubscriber((mask) => {
      if (mask & GridModelEvent.ROWS_RENDER_RANGE && !this.updateStatus.isRunning())
        this.updateStatus.run(1000);
    });

    this.state.filter.addSubscriber(mask => {
      this.updateFilter();
    });
  }

  updateFilter() {
    let {textFilter, textFilterColumn, model, filter} = this.state;
    let filterCond = filter.makeCondition();
    if (textFilter) {
      let cond: CompoundCondition = {
        condition: [
          {
            textValue: textFilter,
            column: textFilterColumn
          }
        ],
        op: 'and'
      };
      if (filterCond)
        cond.condition.push(filterCond);
      model.getFiltering().setConditions(cond);
    } else {
      model.getFiltering().setConditions(filterCond);
    }
  }

  createAppearance(item: number): Appearance {
    const source = this.props.list[item];
    return new AppearanceFromLocalStorage('table-example/' + source, {
      sizes: {},
      columns: []
    });
  }

  createModel(appr: Appearance, item: number): TableSourceModel {
    let model: TableSourceModel;

    const source = this.props.list[item];
    if (source.indexOf('server-') == 0) {
      model = new JSONServerSourceModel('/handler', 'books');
    } else if (source.indexOf('test-') == 0) {
      const delay = 0;
      let dim = source.split('-')[1].split('x').map(n => +n);
      model = new TestTableSourceModel(dim[1], dim[0], delay);
    } else if (source.indexOf('-header.json') != -1) {
      model = new JSONPartialSourceModel('../data/' + source);
    } else {
      model = JSONSourceModel.loadJSON('../data/' + source);
      model.setColumnsAndOrder(appr.getArray('columns'));
    }

    return model;
  }

  createColumnsModel(appr: Appearance, item: number): ColumnsModel {
    const source = this.props.list[item];
    return new ColumnsModel(null, appr);
  }

  onDataSelected = () => {
    const appr = this.createAppearance(this.state.listItem);
    this.setState({
      appr,
      columns: this.createColumnsModel(appr, this.state.listItem),
      model: this.createModel(appr, this.state.listItem)
    });
  };

  setDataSelect() {
    let listItem = +(this.refs['select'] as HTMLInputElement).value;
    this.setState({listItem}, this.onDataSelected);
  }

  renderDataList() {
    return (
      <select ref={'select'} onChange={e => this.setDataSelect()} value={'' + this.state.listItem}>
        {this.props.list.map((item, i) => {
          return <option key={i} value={'' + i}>{item}</option>;
        })}
      </select>
    );
  }

  hideColumn(colId: string) {
    const {model} = this.state;
    let total = model.getTotal();
    let order = model.getColumnsAndOrder();
    if (order.length == 0) {
      for (let n = 0; n < total.columns; n++) {
        order.push(model.getColumn(n).id);
      }
    }
    order = order.filter(col => colId != col);
    model.setColumnsAndOrder(order);
    this.state.appr.setArray('columns', order);
  }

  wrapHeader = (e: JSX.Element, colId: string, colIdx: number) => {
    const column = this.state.columns.getColumn(colId);
    const items = [
      {
        label: 'hide column',
        command: () => {
          this.hideColumn(colId);
        }
      }, {
        label: 'show all',
        command: () => {
          this.state.appr.setArray('columns', []);
          this.state.model.setColumnsAndOrder([]);
        }
      }, {
        label: 'sort asc',
        command: () => {
          this.state.model.getSorting().setColumns([{column: colId, dir: SortDir.asc}]);
        }
      }, {
        label: 'sort desc',
        command: () => {
          this.state.model.getSorting().setColumns([{column: colId, dir: SortDir.desc}]);
        }
      }, {
        label: 'filter',
        command: () => {
          Dialog.showModal(<FilterPanel dataSource={this.state.model} model={this.state.filter}/>);
        }
      }
    ];
    const onContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      Menu.showAt({x: event.pageX, y: event.pageY}, <Menu items={items} onShow={(show: boolean) => {
        this.setState({hoverColumn: !show ? null : colId});
      }}/>);
    };

    const onClickBy = (event: React.MouseEvent) => {
      event.stopPropagation();
      Menu.showUnder(event.currentTarget as HTMLElement, <Menu items={items} onShow={(show: boolean) => {
        this.setState({hoverColumn: !show ? null : colId});
      }}/>);
    };

    let icon = (
      <i
        className='fa fa-bars'
        onMouseDown={onClickBy}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />);
    let iconSort;

    let sort = this.state.model.getSorting();
    if (sort) {
      let arr = sort.getColumns().filter(item => item.column == colId);
      if (arr.length && arr[0].dir == SortDir.asc) {
        iconSort = <i className='fa fa-sort-amount-asc' onMouseDown={onClickBy}/>;
      } else if (arr.length && arr[0].dir == SortDir.desc) {
        iconSort = <i className='fa fa-sort-amount-desc' onMouseDown={onClickBy}/>;
      }
    }

    return (
      <div
        className={className(
          classes.headerWrapper,
          this.state.hoverColumn == colId && classes.hover,
          iconSort && classes.sorted)}
        title={colId}
        onContextMenu={onContextMenu}>
          <div className={classes.headerLabel}>{e}</div>
          {iconSort || icon}
      </div>
    );
  }
  
  showCellContextMenu(x: number, y: number) {
    let columnIdx = this.state.view.getSelectColumn();
    let cell = this.state.model.getCell(columnIdx, this.state.view.getSelectRow());
    let column = this.state.model.getColumn(columnIdx);
    const items = [
      {
        label: `include "${cell.value}"`,
        command: () => {
          this.state.filter.getInclude().addItem(column.id, cell.value);
        }
      }, {
        label: `include all`,
        command: () => {
          this.state.filter.getInclude().clear();
          this.state.filter.getExclude().clear();
        }
      }, {
        label: `exclude "${cell.value}"`,
        command: () => {
          this.state.filter.getExclude().addItem(column.id, cell.value);
        }
      }
    ];
    Menu.showAt({x, y}, <Menu items={items}/>);
  }

  onCellContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = [e.pageX, e.pageY];
    new Timer(() => this.showCellContextMenu(pos[0], pos[1])).run(1);
  }

  wrapCell = (e) => {
    return <div onContextMenu={this.onCellContextMenu} style={{height: '100%'}}>{e}</div>;
  }

  renderTextFilter() {
    if (!this.state.columnsSource)
      return;

    return (
        <div>
          <ComboBox
            style={{display: 'inline-block', width: 100}}
            sourceModel={this.state.columnsSource}
            onSelect={(value, row) => {
              this.setState({textFilterColumn: value});
            }}/>
            <input defaultValue={this.state.textFilter} onKeyDown={(e) => {
              if (e.keyCode == KeyCode.Enter) {
                this.setState({textFilter: (e.target as any as HTMLInputElement).value}, () => {
                  this.updateFilter();
                });
              }
            }}/>
        </div>
      );
  }

  renderTable() {
    if (!this.state.model)
      return (<div>No data to display</div>);

    return (
      <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
        <div>
          {this.state.status}
          {this.renderTextFilter()}
        </div>
        <div style={{flexGrow: 1}}>
        <FitToParent>
          <Table
            defaultRowHeight={40}
            viewModel={this.state.view}
            columnsModel={this.state.columns}
            sourceModel={this.state.model}
            wrapHeader={this.wrapHeader}
            wrapCell={this.wrapCell}
            style={{position: 'absolute'}}/>
        </FitToParent>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <div style={{padding: 4}}>
          {this.renderDataList()}
          <button onClick={() => this.state.model.reload()}>reload</button>
        </div>
        <div style={{flexGrow: 1, display: 'flex'}}>
          {this.renderTable()}
        </div>
      </div>
    );
  }
}

document.body.style.overflow = 'hidden';
getContainer().style.position = 'relative';
let list = [
  'ps-detailed.json',
  'full.json',
  'gens.json',
  'part-header.json',
  'test-900000x1000',
  'server-morpho'
];
ReactDOM.render(<DataSelector list={list}/>, getContainer());
