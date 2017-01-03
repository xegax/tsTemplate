import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {GridControl} from 'controls/grid/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {DataRange, TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';
import {TestTableSourceModel} from 'model/test-table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table/simple-table';
import {assign} from 'lodash';
import {ColumnsModel} from 'controls/table/columns-model';
import {AppearanceFromLocalStorage, Appearance} from 'common/appearance';

interface State {
  listItem?: number;
  data?: any;
  model?: TableSourceModel;
  columns?: ColumnsModel;
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

    this.state.model = this.createModel(this.state.listItem);
    this.state.columns = new ColumnsModel(null, this.createAppearance(this.state.listItem));
  }

  createModel(item: number): TableSourceModel {
    const source = this.props.list[item];
    if (source.indexOf('test-') == 0) {
      const delay = 0;
      let dim = source.split('-')[1].split('x').map(n => +n);
      return new TestTableSourceModel(dim[1], dim[0], delay);
    } else if (source.indexOf('-header.json') != -1) {
      return new JSONPartialSourceModel('../data/' + source);
    }
    
    return JSONSourceModel.loadJSON('../data/' + source);
  }

  createAppearance(item: number): Appearance {
    const source = this.props.list[item];
    return new AppearanceFromLocalStorage('table-example/' + source, {
      sizes: {}
    });
  }

  onDataSelected = () => {
    this.setState({
      model: this.createModel(this.state.listItem),
      columns: new ColumnsModel(null, this.createAppearance(this.state.listItem))
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
    if (!this.state.model)
      return (<div>No data to display</div>);

    return (
      <FitToParent>
        <Table
          defaultRowHeight={100}
          columnsModel={this.state.columns}
          sourceModel={this.state.model}
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
  'test-900000x1000'
];
ReactDOM.render(<DataSelector list={list}/>, getContainer());
