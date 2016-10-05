import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {MapControl} from 'controls/map-control';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';

interface Props {
  model: Model;
}

interface State {
  columnSizes?: Array<number>;
}

interface Cell {
  element: JSX.Element | string;
  className?: string;
}

interface Model {
  getColumnsRange(columns: Array<number>): Array<string>;
  getCellsRange(columns: Array<number>, rows: Array<number>): Array<Array<string>>;
  getColumnsNum(): number;
  getRowsNum(): number;
}

function inRange(value, range: Array<number>) {
  return value >= range[0] && value <= range[1];
}

function makeJSONArrayModel(data: Array<{[key: string]: string}>, colNames?: Array<string>): Model {
  if (!colNames)
    colNames = Object.keys(data[0]);

  let model: Model = {
    getColumnsRange: (range: Array<number>) => colNames.slice(range[0], range[1] + 1),
    getCellsRange: (columns: Array<number>, rows: Array<number>) => {
      let cells = Array<Array<string>>(columns[1] - columns[0] + 1);
      for (let c = 0; c < cells.length; c++) {
        let rowArr = cells[c] = Array<string>(rows[1] - rows[0] + 1);
        for (let r = 0; r < rowArr.length; r++) {
          try {
            rowArr[r] = '' + data[r + rows[0]][colNames[c + columns[0]]];
          } catch(e) {
            console.log(e);
          }
        }
      }
      return cells;
    },
    getColumnsNum: () => colNames.length,
    getRowsNum: () => data.length
  };

  return model;
}

class Table extends React.Component<Props, State> {
  private cells = Array<Array<string>>();
  private header = Array<string>();
  private columns = Array<number>();
  private rows = Array<number>();

  constructor(props: Props) {
    super(props);
    this.state = {
      columnSizes: this.makeColumnSizes(props)
    };
  }

  private makeColumnSizes(props: Props) {
    let columns = props.model.getColumnsNum();
    let columnSizes = Array<number>(columns);
    for (let n = 0; n < columnSizes.length; n++) {
      columnSizes[n] = 150;
    }

    return columnSizes;
  }

  componentWillReceiveProps(newProps: Props) {
    setTimeout(() => {

    }, 1);

    let grid = this.refs['grid'] as GridControl;
    let columnSizes = this.makeColumnSizes(newProps);
    grid.setColumns(columnSizes, () => {
      this.updateCells(newProps, grid.getColumnsRange(), grid.getRowsRange());
      this.setState({columnSizes});
    });
  }

  private onUpdate = (eventMask) => {
    this.forceUpdate();
  }

  private updateCells(props: Props, colsRange: Array<number>, rowsRange: Array<number>) {
    this.rows = rowsRange.slice();
    this.columns = colsRange.slice();

    this.cells = props.model.getCellsRange(colsRange, rowsRange);
    this.header = props.model.getColumnsRange(colsRange);
  }

  private onChanged = (event) => {
    this.updateCells(this.props, event.columns, event.rows);
    this.forceUpdate();
  }

  renderCell = (column, row) => {
    if (inRange(column, this.columns) && inRange(row, this.rows)) {
      let cell = this.cells[column - this.columns[0]][row - this.rows[0]];
      return {
        element: <div style={{padding: 3}}>{cell}</div> as any
      };
    }

    return {
      element: '?'
    }
  }

  renderHeader = (column) => {
    return {element: this.header[column - this.columns[0]]};
  }

  renderMapControl() {
    let {model} = this.props;
    let columns = model.getColumnsNum();
    let rows = model.getRowsNum();
    return (
      <FitToParent>
        <MapControl
          selectable resizable alignedRows
          onChanged={this.onChanged}
          renderCell={this.renderCell}
          renderHeader={this.renderHeader}
          columns={columns}
          rows={rows}
          cellHeight={46}
          cellWidth={300}
        />
      </FitToParent>
    );
  }

  renderGridControl() {
    let {model} = this.props;
    let {columnSizes} = this.state;
    let columns = model.getColumnsNum();
    let rows = model.getRowsNum();
    return (
      <FitToParent>
        <GridControl
          ref='grid'
          style={{position: 'absolute'}}
          aligned resizable
          onChanged={this.onChanged}
          renderCell={this.renderCell}
          renderHeader={this.renderHeader}
          rows={rows}
          columns={columnSizes}
          cellHeight={46}
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
          return <option key={i} value={'' + i}>{item}</option>
        })}
      </select>
    );
  }

  renderTable() {
    if (this.state.data)
      return <Table model={makeJSONArrayModel(this.state.data)} />;
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
