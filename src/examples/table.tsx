import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {Cell, TableModel, JSONTableModel, TableModelEvent} from 'model/table-model';

interface Props {
  model: TableModel;
}

interface State {
  columnSizes?: Array<number>;
}

interface Model {
  getColumnsRange(columns: Array<number>): Array<string>;
  getCellsRange(columns: Array<number>, rows: Array<number>): Array<Array<string>>;
  getColumnsNum(): number;
  getColumnSizes(): Array<number>;
  getRowsNum(): number;
}

function inRange(value, range: Array<number>) {
  return value >= range[0] && value <= range[1];
}

function makeJSONArrayModel(data: Array<{[key: string]: string}>, colNames?: Array<string>): Model {
  if (!colNames)
    colNames = Object.keys(data[0]);

  let columnSizes = colNames.map(name => {
    if (['type', 'images'].indexOf(name) != -1)
      return 50;
    return 0.5;
  });

  let model: Model = {
    getColumnsRange: (range: Array<number>) => colNames.slice(range[0], range[1] + 1),
    getCellsRange: (columns: Array<number>, rows: Array<number>) => {
      let cells = Array<Array<string>>(columns[1] - columns[0] + 1);
      for (let c = 0; c < cells.length; c++) {
        let rowArr = cells[c] = Array<string>(rows[1] - rows[0] + 1);
        for (let r = 0; r < rowArr.length; r++) {
          try {
            rowArr[r] = '' + data[r + rows[0]][colNames[c + columns[0]]];
          } catch (e) {
            console.log(e);
          }
        }
      }
      return cells;
    },
    getColumnsNum: () => colNames.length,
    getRowsNum: () => data.length,
    getColumnSizes: () => columnSizes
  };

  return model;
}

class Table extends React.Component<Props, State> {
  private cells = Array<Array<Cell>>();
  private header = Array<string>();
  private columns = Array<number>();
  private rows = Array<number>();
  private model = new GridModel();

  constructor(props: Props) {
    super(props);
    this.state = {
      columnSizes: []
    };

    this.props.model.addSubscriber(this.onTableChanged);
    this.model.addSubscriber(this.onCellsRenderRangeChanged);

    this.model.setCellSelectable(true);
  }

  private onTableChanged = (eventMask) => {
    let {model} = this.props;
    if (eventMask & TableModelEvent.DIMENSION) {
      let dim = model.getDimension();
      this.model.setRows(dim.rows);

      let columns = Array<number>(dim.columns);
      for (let n = 0; n < columns.length; n++)
        columns[n] = 1;
      this.model.setColumns(columns);
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.rows = model.getRowsRange();
      this.columns = model.getColumnsRange();
      this.cells = model.getCells();
      this.header = model.getColumns().map(col => col.label);
      this.forceUpdate(() => this.model.notifySubscribers());
    }
  };

  private onCellsRenderRangeChanged = (eventMask) => {
    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.selectCells(this.props);
    }
  };

  componentWillReceiveProps(newProps: Props) {
    /*this.model.setColumns(this.makeColumnSizes(newProps));
    this.model.setRows(newProps.model.getRowsNum());
    this.onChanged(newProps);
    this.forceUpdate(() => this.model.notifySubscribers());*/
  }

  private selectCells(props: Props) {
    let cols = this.model.getColumnsRange();
    let rows = this.model.getRowsRange();
    if (rows[1] - rows[0] <= 0)
      return;
    props.model.selectColumns(cols[0], cols[1]);
    props.model.selectRows(rows[0], rows[1]);
  }

  renderCell = (column, row) => {
    if (inRange(column, this.columns) && inRange(row, this.rows)) {
      let cell = this.cells[column - this.columns[0]][row - this.rows[0]].value + '';
      return {
        element: <div style={{padding: 3}}>{cell}</div> as any
      };
    }

    return {
      element: '?'
    };
  }

  renderHeader = (column) => {
    return {element: this.header[column - this.columns[0]]};
  }

  renderGridControl() {
    return (
      <FitToParent>
        <GridControl
          ref='grid'
          style={{position: 'absolute'}}
          resizable
          renderCell={this.renderCell}
          renderHeader={this.renderHeader}
          model={this.model}
        />
      </FitToParent>
    );
  }

  render() {
    return this.renderGridControl();
  }
}

class DataSelector extends React.Component<{list: Array<string>}, {listItem?: number, data?: any}> {
  constructor(props) {
    super(props);
    this.state = {
      listItem: 0
    };
    this.onDataSelected();
  }

  onDataSelected = () => {
    d3.json('../data/' + this.props.list[this.state.listItem], (err, data: Array<{[key: string]: string}>) => {
      this.setState({data});
    });
  }

  setDataSelect() {
    let listItem = +(this.refs['select'] as HTMLInputElement).value;
    this.setState({listItem}, () => this.onDataSelected());
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

  renderTable() {
    if (this.state.data)
      return <Table model={new JSONTableModel(this.state.data)} />;
    return null;
  }

  render() {
    return (
      <div className={'fit-to-parent'} style={{display: 'flex', flexDirection: 'column'}}>
        <div style={{padding: 4}}>
          {this.renderDataList()}
        </div>
        <div style={{flexGrow: 1}}>
          {this.renderTable()}
        </div>
      </div>
    );
  }
}

document.body.style.overflow = 'hidden';
getContainer().style.position = 'relative';
ReactDOM.render(<DataSelector list={['full.json', 'gens.json', 'full.json']}/>, getContainer());
