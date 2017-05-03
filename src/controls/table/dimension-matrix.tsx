import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {SortDir, SortColumn} from 'common/table';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {className, join} from 'common/common';
import {Table, WrapCell} from 'controls/table/simple-table';
import {assign, cloneDeep} from 'lodash';
import {ColumnsModel} from 'controls/table/columns-model';
import {AppearanceFromLocalStorage, Appearance} from 'common/appearance';
import {Menu} from 'controls/menu';
import {Timer} from 'common/timer';
import {Dialog} from 'controls/dialog';
import {FilterModel} from 'controls/filter/filter-model';
import {ComboBox} from 'controls/combobox';
import {KeyCode} from 'common/keycode';
import {CompoundCondition, ColumnCondition, FilterCondition} from 'table/filter-condition';
import {Layout} from 'controls/layout/layout';
import * as Scheme from 'controls/layout/Scheme';
import {Details} from 'examples/details';
import {TableData} from 'table/table-data';
import {loadTable} from 'table/server-table-data';
import {IThenable} from 'promise';
import {TextBox} from 'controls/textbox';
import {RowGroup, ColumnGroup} from 'controls/layout';
import {ExtTable, ExtTableModel} from 'controls/table/ext-table';
import {Publisher} from 'common/publisher';
import {JSONTableData2} from 'table/json-table-data';
import {FitToParent} from 'common/fittoparent';

interface Dimension {
  column: string;
  table: TableData;
  sorting: SortColumn;
  select: Array<string>;
  loading: boolean;
}

export class DimensionMatrixModel extends Publisher {
  static readonly Event = {
    DmTables: 1
  };

  private table: TableData;
  private currTable: TableData;
  private dimensions: Array<Dimension>;
  private order = Array<number>();  // индексы колонок из columns

  private reqTimer: Timer = new Timer(() => this.requestData());

  constructor(table: TableData, columns: Array<string>) {
    super();
    this.table = table;
    this.dimensions = columns.map(column => {
      return {
        column,
        table: null,
        sorting: {column: 'count', dir: SortDir.desc},
        select: [],
        loading: true
      };
    });
    this.requestData();
  }

  private requestDimensions(dmTables: Array<IThenable<TableData>>, dmIdx: Array<number>) {
    Promise.all(dmTables).then(tables => {
      tables.forEach((table, idx) => {
        const info = table.getInfo();
        const dm = this.dimensions[dmIdx[idx]];
        dm.loading = false;
        dm.table = new JSONTableData2(
          info.rowNum,
          [dm.column],
          (row, col, table) => {
            const cell = table.getCell(row, 0);
            const count = table.getCell(row, 1);
            return {text: `${cell.text} (${count.text})`, raw: cell.raw};
          }, table);
      });
      this.updateVersion(DimensionMatrixModel.Event.DmTables, 1);
    });
  }

  getTable(): TableData {
    return this.currTable || this.table;
  }

  getColumns(): Array<TableData> {
    return this.dimensions.map(dm => dm.table);
  }

  getLabels(): Array<string> {
    return this.dimensions.map(dm => dm.column);
  }

  setSorting(colIdx: number, sort: SortColumn) {
    this.dimensions[colIdx].sorting = sort;
  }

  getSelectColumnIdx(): Array<number> {
    return this.order.slice();
  }

  getColumnSelectValues(colIdx: number): Array<string> {
    return this.dimensions[colIdx].select;
  }

  private requestData() {
    const dmIdxs = [];
    if (this.order.length == 0) { // nothing selected
      this.dimensions.forEach(dm => dm.loading = true);
      this.updateVersion(DimensionMatrixModel.Event.DmTables, 1);

      this.table.setParams({filter: null}).then(table => {
        const dmTables = this.dimensions.map((dm, i) => {
          dmIdxs.push(i);
          return table.createSubtable({sort: [dm.sorting], distinct: dm.column})
        });
        this.currTable = table;
        this.requestDimensions(dmTables, dmIdxs);
      });
    } else {
      this.dimensions.forEach((dm, idx) => {
        if (this.order.indexOf(idx) == -1) {
          dmIdxs.push(idx);
          this.dimensions[idx].loading = true;
        }
      });
      this.updateVersion(DimensionMatrixModel.Event.DmTables, 1);
      const filter = this.getFilterCondition();

      this.table.setParams({filter}).then(table => {
        let dmTables = dmIdxs.map(idx => {
          const dm = this.dimensions[idx];
          return table.createSubtable({
            sort: [dm.sorting],
            distinct: dm.column
          })
        });
        this.currTable = table;
        this.requestDimensions(dmTables, dmIdxs);
      });
    }
  }

  setSelect(colIdx: number, values: Array<string>) {
    let idx = this.order.indexOf(colIdx);
    if (values.length) {
      if (idx != -1) {
        this.order = this.order.slice(0, idx + 1);
        colIdx = this.order[idx];
      } else {
        this.order.push(colIdx);
      }
    } else if (idx != -1) {
      this.order = this.order.slice(0, idx + 1);
      this.dimensions.forEach((v, idx) => {
        if (this.order.indexOf(idx) == -1)
          v.select.splice(0, v.select.length);
      });
    }

    this.dimensions[colIdx].select = values;
    this.reqTimer.run(100);
  }

  getSelect(colIdx: number) {
    return this.dimensions[colIdx].select.slice();
  }

  clearSelect() {
    this.order.splice(0, this.order.length);
    this.dimensions.forEach(dm => dm.select.splice(0, dm.select.length));

    this.reqTimer.run(100);
  }

  isLoading(colIdx: number) {
    return this.dimensions[colIdx].loading || false;
  }

  getFilterCondition(): FilterCondition {
    const condition = Array<ColumnCondition>();
    for (let n = 0; n < this.order.length; n++) {
      const colIdx = this.order[n];
      condition.push({
        column: this.dimensions[colIdx].column,
        catValues: this.dimensions[colIdx].select
      });
    }

    if (!condition.length)
      return null;

    return {
      op: 'and',
      condition
    };
  }
}

interface Props {
  model: DimensionMatrixModel;
  width?: number;
  height?: number;
}

interface State {
  scheme: {root: Scheme.Scheme};
}

export class DimensionMatrix extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    this.props.model.addSubscriber(this.modelSubscriber);
    this.state = {
      scheme: {
        root: Scheme.column(
          Scheme.row(
            Scheme.item('columns', 1)
          ), Scheme.row(
            Scheme.item('path', 0)
          ).grow(0)
        ).get()
      }
    };
  }

  modelSubscriber = (mask: number) => {
    this.forceUpdate();
  }

  onSelect(row, colIdx, table: TableData) {
    const value = table.getCell(row, 0).raw;
    this.props.model.setSelect(colIdx, [value]);
  }

  renderHeader(colIdx: number, column: string, count: number) {
    if (this.props.model.isLoading(colIdx))
      return [column, ' (', <i style={{display: 'inline-block'}} className='fa fa-spinner fa-spin'/>, ')'];
    return `${column} (${count})`;
  }

  renderCell(params: WrapCell, colIdx: number) {
    const {table, row} = params;
    const selLst = this.props.model.getSelect(colIdx);
    const select = selLst.indexOf(table.getCell(row, 0).raw) != -1;
    return (
      <div style={{height: '100%', backgroundColor: select ? 'lightblue' : null}}
        onClick={e => {
          const value = table.getCell(row, 0).raw;
          const sel = e.ctrlKey ? selLst : [];
          if (sel.indexOf(value) == -1)
            this.props.model.setSelect(colIdx, sel.concat([value]));
        }}>{params.element}</div>
    );
  }

  getColumnMenu(column, idx, table: ExtTableModel) {
    const model = this.props.model;
    return [
      {
        label: 'count by asc',
        command: () => {
          table.clearSorting();
          table.addSorting('count', SortDir.asc);
          model.setSorting(idx, {column: 'count', dir: SortDir.asc});
        }
      }, {
        label: 'count by desc',
        command: () => {
          table.clearSorting();
          table.addSorting('count', SortDir.desc);
          model.setSorting(idx, {column: 'count', dir: SortDir.desc});
        }
      }, {
        label: 'name by asc',
        command: () => {
          table.clearSorting();
          table.addSorting(column, SortDir.asc);
          model.setSorting(idx, {column, dir: SortDir.asc});
        }
      }, {
        label: 'name by desc',
        command: () => {
          table.clearSorting();
          table.addSorting(column, SortDir.desc);
          model.setSorting(idx, {column, dir: SortDir.desc});
        }
      }, {
        label: 'remove',
        command: () => {
          model.setSelect(idx, []);
        }
      }
    ];
  }

  renderPath(id: string) {
    const model = this.props.model;
    const select = model.getSelectColumnIdx();
    const labels = model.getLabels();

    let path = [
      <span style={{cursor: 'pointer'}} onClick={() => model.clearSelect()}>Root</span>
    ];

    path = path.concat(
      select.map(idx => {
        let values = model.getColumnSelectValues(idx);
        return (
          <span onClick={() => model.setSelect(idx, model.getSelect(idx))}>
            {`${labels[idx]} (${values.length})`}
          </span>
        );
      })
    );

    return (
      <div key={id}>
        {join(path, <span> -> </span>)}
      </div>
    );
  }

  renderColumn = (props: React.HTMLProps<any>) => {
  }

  renderColumns = (props: React.HTMLProps<any>) => {
    const id = 'columns';
    const columns = this.props.model.getColumns();
    if (!columns || !columns.length)
      return <div key={id}>No data to display</div>;

    const {width, height} = props;
    let left = 0;
    return (
      <div key={id} style={{overflowX: 'auto', overflowY: 'hidden', position: 'relative', width, height}}>
        {columns.map((column, colIdx) => {
          let el = <div>?</div>;

          if (column) {
            const info = column.getInfo();
            el = (
              <div key={'dm-column' + colIdx} style={{left, width: 200, height: '100%', position: 'absolute'}}>
                <FitToParent>
                  <ExtTable
                    defaultFeatures={GridModelFeatures.ROWS_HIGHLIGHTABLE|GridModelFeatures.ROWS_ALIGNED}
                    width={200}
                    tableData={column}
                    wrapHeader={(header, column) => this.renderHeader(colIdx, column, info.rowNum)}
                    wrapCell={params => this.renderCell(params, colIdx)}
                    getColumMenu={(column, idx, menu) => this.getColumnMenu(column, colIdx, menu)}
                  />
                </FitToParent>
              </div>
            );
          }
          left += 200;
          return el;
        })}
      </div>
    );
  }

  render() {
    return (
      <Layout scheme={this.state.scheme}>
        <this.renderColumns key='columns'/>
        {this.renderPath('path')}
      </Layout>
    );
  }
}

/*loadTable('books').then(table => {
  const model = new DimensionMatrixModel(table, ['genre', 'author', 'lang', 'srcLang']);
  ReactDOM.render(<DimensionMatrix width={1000} height={518} model={model}/>, getContainer());
});*/