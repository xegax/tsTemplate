import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent} from 'controls/grid/grid-model';
import {DataRange, TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';
import {TestTableSourceModel} from 'model/test-table-source-model';

interface Props {
  sourceModel: TableSourceModel;
}

interface State {
}

class Table extends React.Component<Props, State> {
  private viewModel = new GridModel();
  private sourceModel: OrderedColumnsSourceModel;

  constructor(props: Props) {
    super(props);
    this.state = {};

    this.sourceModel = new OrderedColumnsSourceModel(this.props.sourceModel);
    this.sourceModel.addSubscriber(this.onSourceChanged);
    this.viewModel.addSubscriber(this.onViewChanged);

    this.viewModel.setCellSelectable(true);
  }

  private onSourceChanged = (eventMask: number) => {
    if (eventMask & TableModelEvent.TOTAL) {
      let total = this.sourceModel.getTotal();
      this.viewModel.setRows(total.rows);

      let columns = Array(total.columns);
      for (let n = 0; n < columns.length; n++) {
        columns[n] = 150;
      }
      this.viewModel.setColumns(columns);
    }

    if (eventMask & (TableModelEvent.ROWS_SELECTED | TableModelEvent.COLUMNS_SELECTED)) {
      this.forceUpdate(() => {
        this.viewModel.notifySubscribers();
      });
    }
  };

  private onViewChanged = (eventMask: number) => {
    if (eventMask & (GridModelEvent.COLUMNS_RENDER_RANGE | GridModelEvent.ROWS_RENDER_RANGE)) {
      this.sourceModel.loadData({cols: this.viewModel.getColumnsRange(), rows: this.viewModel.getRowsRange()});
    }
  };

  componentWillReceiveProps(newProps: Props) {
    if (this.props.sourceModel != newProps.sourceModel) {
      this.viewModel = new GridModel(this.viewModel);
      this.viewModel.setCellSelectable(true);
      this.sourceModel = new OrderedColumnsSourceModel(newProps.sourceModel);
    }
  }

  renderCell = (column: number, row: number) => {
    let cell = this.sourceModel.getCell(column, row).value;
    return {
       element: <div style={{padding: 3, whiteSpace: 'nowrap', textOverflow: 'inherit', overflow: 'hidden'}}>{cell}</div> as any
    };
  }

  onClickByHeader(column: number) {
    this.sourceModel.removeColumn(column);
    this.onSourceChanged(TableModelEvent.TOTAL);
  }

  renderHeader = (column: number) => {
    let value;// = this.props.model.getColumn(column);
    return {
      element: <div onClick={e => this.onClickByHeader(column)}>{'column ' + column}</div>
    };
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
          model={this.viewModel}
        />
      </FitToParent>
    );
  }

  render() {
    return this.renderGridControl();
  }
}

class DataSelector extends React.Component<{list: Array<string>}, {listItem?: number, data?: any, model?: TableSourceModel}> {
  constructor(props) {
    super(props);
    this.state = {
      listItem: 0
    };
    this.onDataSelected();
  }

  onDataSelected = () => {
    let source = this.props.list[this.state.listItem];
    if (source.indexOf('test-') == 0) {
      const delay = 0;
      let dim = source.split('-')[1].split('x').map(n => +n);
      this.setState({model: new TestTableSourceModel(dim[1], dim[0], delay, this.state.model)});
    } else if (source.indexOf('-header.json') != -1) {
      this.setState({model: new JSONPartialSourceModel('../data/' + source, this.state.model)});
    } else {
      d3.json('../data/' + source, (err, data: Array<{[key: string]: string}>) => {
        this.setState({model: new JSONSourceModel(data, this.state.model)});
      });
    }
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
    if (!this.state.model)
      return (<div>No data to display</div>);
    return <Table sourceModel={this.state.model} />;
  }

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <div style={{padding: 4}}>
          {this.renderDataList()}
          <button onClick={() => this.state.model.reload()}>reload</button>
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
ReactDOM.render(<DataSelector list={['full.json', 'gens.json', 'part-header.json', 'test-900000x1000']}/>, getContainer());
