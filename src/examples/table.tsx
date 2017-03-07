import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {SortDir} from 'common/table';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {className} from 'common/common';
import {Table} from 'controls/table/simple-table';
import {assign, cloneDeep} from 'lodash';
import {ColumnsModel} from 'controls/table/columns-model';
import {AppearanceFromLocalStorage, Appearance} from 'common/appearance';
import {Menu} from 'controls/menu';
import {Timer} from 'common/timer';
import {Dialog} from 'controls/dialog';
import {FilterModel} from 'controls/filter/filter-model';
import {ComboBox} from 'controls/combobox';
import {KeyCode} from 'common/keycode';
import {CompoundCondition, FilterCondition} from 'table/filter-condition';
import {Layout} from 'controls/layout/layout';
import * as Scheme from 'controls/layout/Scheme';
import {Details} from 'examples/details';
import {TableData} from 'table/table-data';
import {loadTable} from 'table/server-table-data';
import {IThenable} from 'promise';
import {TextBox} from 'controls/textbox';
import {RowGroup, ColumnGroup} from 'controls/layout';

interface State {
  view?: GridModel;
  table?: TableData;
  details?: TableData;
  detailsRow?: number;
  columns?: ColumnsModel;
  appr?: Appearance;
  hoverColumn?: string;
  status?: string;
  filter?: FilterModel;
  columnsSource?: TableData;
  textFilterColumn?: string;
  textFilter?: string;
  scheme?: {root: Scheme.Scheme};
}

interface Props {
}

const classes = {
  headerWrapper: 'table-header-wrapper',
  headerLabel: 'table-header-wrapper__label',
  hover: 'hover',
  sorted: 'sorted'
};

class ExtendedTable extends React.Component<Props, State> {
  private updateStatus = new Timer(() => {
    let total = this.state.table.getInfo();
    let range = this.state.view.getRowsRange();
    let status = `total rows: ${total.rowNum}, start row: ${range[0]}`;
    if (this.state.status != status)
      this.setState({status});
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      view: new GridModel(),
      filter: new FilterModel(),
      detailsRow: -1
    };

    this.state.appr = new AppearanceFromLocalStorage('table-example/books', {
      sizes: {},
      columns: [],
      scheme: JSON.stringify(this.getScheme())
    });
    this.state.columns = new ColumnsModel(null, this.state.appr);
    this.state.scheme = {root: JSON.parse(this.state.appr.getString('scheme'))};

    loadTable('books', null, ['id', 'title', 'genre', 'author']).then(table => {
      table.getSubtable({columns: []}).then(details => {
        this.setState({table: table, details, columnsSource: details.getColumns()});
      });
    });

    this.state.view.addSubscriber((mask) => {
      if (mask & GridModelEvent.ROWS_RENDER_RANGE && !this.updateStatus.isRunning())
        this.updateStatus.run(1000);
      if (mask & (GridModelEvent.COLUMN_SELECT | GridModelEvent.ROW_SELECT)) {
        const detailsRow = this.state.view.getSelectRow();
        this.setState({detailsRow});
      }
    });

    this.state.filter.addSubscriber(mask => {
      this.applyFilter();
    });
  }

  private applyFilter() {
    this.state.table.getSubtable({filter: this.getFilterCondition()})
      .then(table => {
        table.getSubtable({columns: []}).then(details => {
          this.setState({table, details});
        });
      });
  }

  getFilterCondition() {
    let {textFilter, textFilterColumn, table, filter} = this.state;
    let cond: FilterCondition = filter.makeCondition();
    if (textFilter) {
      let compCond: CompoundCondition = {
        condition: [
          {
            textValue: textFilter,
            column: textFilterColumn
          }
        ],
        op: 'and'
      };
      if (cond)
        compCond.condition.push(cond);
      cond = compCond;
    }
    return cond;
  }

  setSorting(column: string, dir: SortDir) {
    this.state.table.getSubtable({
      sort: [{column, dir}],
      filter: this.getFilterCondition()
    }).then(table => {
      table.getSubtable({columns: []}).then(details => {
        this.setState({table, details});
      });
    });
  }

  wrapHeader = (e: JSX.Element, colId: string, colIdx: number) => {
    const column = this.state.columns.getColumn(colId);
    const items = [
      {
        label: 'show all',
        command: () => {
          this.state.appr.setArray('columns', []);
          this.state.table.getSubtable({columns: []}).then(table => this.setState({table: table}));
        }
      }, {
        label: 'sort asc',
        command: () => {
          this.setSorting(colId, SortDir.asc);
        }
      }, {
        label: 'sort desc',
        command: () => {
          this.setSorting(colId, SortDir.desc);
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

    /*let sort = this.state.model.getSorting();
    if (sort) {
      let arr = sort.getColumns().filter(item => item.column == colId);
      if (arr.length && arr[0].dir == SortDir.asc) {
        iconSort = <i className='fa fa-sort-amount-asc' onMouseDown={onClickBy}/>;
      } else if (arr.length && arr[0].dir == SortDir.desc) {
        iconSort = <i className='fa fa-sort-amount-desc' onMouseDown={onClickBy}/>;
      }
    }*/

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
    let table = this.state.table;
    let columns = table.getColumns();
    let cell = table.getCell(this.state.view.getSelectRow(), columnIdx);
    let column = columns.getCell(columnIdx, 0);
    const items = [
      {
        label: `include "${cell.text}"`,
        command: () => {
          this.state.filter.getInclude().addItem(column.text, cell.text);
        }
      }, {
        label: `include all`,
        command: () => {
          this.state.filter.getInclude().clear();
          this.state.filter.getExclude().clear();
        }
      }, {
        label: `exclude "${cell.text}"`,
        command: () => {
          this.state.filter.getExclude().addItem(column.text, cell.text);
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
    return (
      <div
        onContextMenu={this.onCellContextMenu}
        style={{height: '100%'}}
      >
        {e}
      </div>
    );
  }

  renderTextFilter() {
    if (!this.state.columnsSource)
      return;

    return (
        <RowGroup>
          <ComboBox
            style={{display: 'inline-block', width: 100}}
            tableData={this.state.columnsSource}
            onSelect={(value, row) => {
              this.setState({textFilterColumn: value});
            }}/>
            <TextBox defaultValue={this.state.textFilter}
              onKeyDown={(e) => {
                if (e.keyCode == KeyCode.Enter) {
                  this.setState({textFilter: (e.target as any as HTMLInputElement).value}, () => {
                    this.applyFilter();
                  });
                }
              }}
            />
        </RowGroup>
      );
  }

  renderStatus(id: string) {
    return (
      <ColumnGroup key={id}>
        {this.state.status}
        {this.renderTextFilter()}
      </ColumnGroup>
    );
  }

  renderTable(id: string) {
    if (!this.state.table)
      return (<div key={id}>No data to display</div>);

    return (
          <Table
            key={id}
            defaultRowHeight={40}
            viewModel={this.state.view}
            columnsModel={this.state.columns}
            tableData={this.state.table}
            wrapHeader={this.wrapHeader}
            wrapCell={this.wrapCell}
          />
    );
  }

  getScheme() {
    return Scheme.column(
      Scheme.item('status', 0),
      Scheme.row(
        Scheme.item('table', 10),
        Scheme.item('details')
      )
    ).get();
  }

  render() {
    if (!this.state.table || !this.state.details)
      return <div>no data to display</div>;

    return (
      <Layout
        scheme={this.state.scheme}
        onChanged={root => {
          this.setState({scheme: {root}});
          this.state.appr.setString('scheme', JSON.stringify(root));
        }}>
        {this.renderTable('table')}
        {this.renderStatus('status')}
        {<Details row={this.state.detailsRow} key='details' model={this.state.details}/>}
      </Layout>
    );
  }
}

ReactDOM.render(<ExtendedTable/>, getContainer());
