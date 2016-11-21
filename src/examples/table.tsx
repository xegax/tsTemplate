import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {TableSourceModel, TableModelEvent, TestTableModel} from 'model/table-source-model';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';

interface Props {
  model: TableSourceModel;
}

interface State {
}

class Table extends React.Component<Props, State> {
  private model = new GridModel();

  constructor(props: Props) {
    super(props);
    this.state = {};

    this.props.model.addSubscriber(this.onTableChanged);
    this.model.addSubscriber(this.onCellsRenderRangeChanged);

    this.model.setCellSelectable(true);
  }

  private onTableChanged = (eventMask: number) => {
    let {model} = this.props;
    if (eventMask & TableModelEvent.TOTAL) {
      let total = model.getTotal();
      this.model.setRows(total.rows);

      let columns = Array(total.columns);
      for (let n = 0; n < columns.length; n++) {
        columns[n] = 150;
      }
      this.model.setColumns(columns);
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.forceUpdate(() => this.model.notifySubscribers());
    }
  };

  private onCellsRenderRangeChanged = (eventMask: number) => {
    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.props.model.loadData({cols: this.model.getColumnsRange(), rows: this.model.getRowsRange()});
    }
  };

  componentWillReceiveProps(newProps: Props) {
    if (this.props.model != newProps.model) {
      this.props.model.removeSubscriber(this.onTableChanged);
      newProps.model.addSubscriber(this.onTableChanged);
    }
  }

  renderCell = (column: number, row: number) => {
    let cell = this.props.model.getCell(column, row).value;
    return {
       element: <div style={{padding: 3}}>{cell}</div> as any
    };
  }

  renderHeader = (column: number) => {
    let value;// = this.props.model.getColumn(column);
    return {element: value ? value.label : '?'};
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
    /*if (this.state.data)
      return <Table model={new JSONTableModel(this.state.data)} />;*/
    return <Table model={new JSONPartialSourceModel('../data/part-header.json')} />;
    // return <Table model={new TestTableModel(90000, 999998, 1500)} />;
  }

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
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
