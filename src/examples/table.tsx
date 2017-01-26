import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {DataRange, TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {JSONPartialSourceModel, JSONServerSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {TestTableSourceModel} from 'model/test-table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table/simple-table';
import {assign} from 'lodash';
import {ColumnsModel} from 'controls/table/columns-model';
import {AppearanceFromLocalStorage, Appearance} from 'common/appearance';
import {Menu} from 'controls/menu';

interface State {
  listItem?: number;
  data?: any;
  model?: TableSourceModel;
  columns?: ColumnsModel;
  appr?: Appearance;
}

interface Props {
  list: Array<string>;
}

class DataSelector extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      listItem: 2
    };

    this.state.appr = this.createAppearance(this.state.listItem);
    this.state.columns = this.createColumnsModel(this.state.appr, this.state.listItem);
    this.state.model = this.createModel(this.state.appr, this.state.listItem);
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
      model = new JSONServerSourceModel('http://localhost:8088', 'morpho');
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

  wrapHeader = (e: JSX.Element, colId: string) => {
    const onContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      let items = [
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
        }
      ];
      Menu.showAt({x: event.pageX, y: event.pageY}, <Menu items={items}/>);
    };
    return <div onContextMenu={onContextMenu}>{e}</div>;
  }

  renderTable() {
    if (!this.state.model)
      return (<div>No data to display</div>);

    return (
      <FitToParent>
        <Table
          defaultRowHeight={40}
          columnsModel={this.state.columns}
          sourceModel={this.state.model}
          wrapHeader={this.wrapHeader}
          style={{position: 'absolute'}}/>
      </FitToParent>
    );
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
let list = [
  'ps-detailed.json',
  'full.json',
  'gens.json',
  'part-header.json',
  'test-900000x1000',
  'server-morpho'
];
ReactDOM.render(<DataSelector list={list}/>, getContainer());
