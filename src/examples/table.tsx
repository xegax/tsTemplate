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
import {ExtTable, ExtTableModel} from 'controls/table/ext-table';

interface State {
  model?: ExtTableModel;
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
  distCol?: string;
  distinct?: TableData;
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
    let total = this.state.view.getRows();
    let range = this.state.view.getRowsRange();
    let status = `total rows: ${total}, start row: ${range[0]}`;
    if (this.state.status != status)
      this.setState({status});
  });

  constructor(props: Props) {
    super(props);
    this.state = {
      view: new GridModel(),
      filter: new FilterModel(),
      detailsRow: -1,
      model: new ExtTableModel()
    };

    this.state.appr = new AppearanceFromLocalStorage('table-example/books', {
      sizes: {},
      columns: [],
      scheme: JSON.stringify(this.getScheme())
    });
    this.state.columns = new ColumnsModel(null, this.state.appr);
    this.state.scheme = {root: JSON.parse(this.state.appr.getString('scheme'))};

    loadTable('books', {columns: ['id', 'title', 'genre', 'author']}).then(table => {
      table.setParams({columns: []}).then(details => {
        this.setState({table, details, columnsSource: details.getColumns()});
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
  }

  renderTextFilter() {
    if (!this.state.columnsSource)
      return;

    const textFilter = this.state.model.getTextFilter();
    return (
        <RowGroup>
          <ComboBox
            style={{display: 'inline-block', width: 100}}
            tableData={this.state.columnsSource}
            onSelect={(value, row) => {
              this.state.model.setTextFilter({column: value});
            }}/>
            <TextBox defaultValue={textFilter.text}
              onKeyDown={(e) => {
                if (e.keyCode == KeyCode.Enter) {
                  this.state.model.setTextFilter({text: (e.target as any as HTMLInputElement).value});
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
        <ComboBox
          textValue={this.state.distCol}
          tableData={this.state.columnsSource}
          style={{width: 100}}
          onSelect={(distinct, row) => {
            this.setState({distCol: distinct});
            this.state.table.createSubtable({distinct})
              .then(distinct => {
                this.setState({distinct});
              });
        }}/>
      </ColumnGroup>
    );
  }

  onTableChanged(tableData: TableData) {
    if (!this.updateStatus.isRunning())
      this.updateStatus.run(1000);
    
    if (this.state.distinct && this.state.distCol) {
      tableData.createSubtable({distinct: this.state.distCol})
        .then(distinct => {
          this.setState({distinct});
        });
    }

    tableData.setParams({columns: []}).then(details => {
      this.setState({details});
    });
  }

  renderTable(id: string) {
    return (
          <ExtTable
            key={id}
            viewModel={this.state.view}
            columns={this.state.columns}
            tableData={this.state.table}
            model={this.state.model}
            onTableChanged={table => this.onTableChanged(table)}
            //wrapHeader={this.wrapHeader}
            //wrapCell={this.wrapCell}
          />
    );
  }

  renderDistinct(id: string) {
    if (!this.state.distinct)
      return <div key={id}>No data to display</div>;
    return (
      <ExtTable
        key={id}
        tableData={this.state.distinct}
      />
    );
  }

  getScheme() {
    return Scheme.column(
      Scheme.item('status', 0),
      Scheme.row(
        Scheme.column(
          Scheme.item('table', 10),
          Scheme.item('distinct')
        ).grow(10),
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
        {this.renderDistinct('distinct')}
        {<Details row={this.state.detailsRow} key='details' model={this.state.details}/>}
      </Layout>
    );
  }
}

ReactDOM.render(<ExtendedTable/>, getContainer());
