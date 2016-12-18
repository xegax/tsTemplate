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

interface State {
  listItem?: number;
  data?: any;
  model?: TableSourceModel;
}

class DataSelector extends React.Component<{list: Array<string>}, State> {
  constructor(props) {
    super(props);
    this.state = {};
    
    this.state = assign({
      listItem: 2
    }, this.getNewState(2));
  }

  getNewState(item: number): State {
    let source = this.props.list[item];
    if (source.indexOf('test-') == 0) {
      const delay = 0;
      let dim = source.split('-')[1].split('x').map(n => +n);
      return {model: new TestTableSourceModel(dim[1], dim[0], delay, this.state.model)};
    } else if (source.indexOf('-header.json') != -1) {
      return {model: new JSONPartialSourceModel('../data/' + source, this.state.model)};
    }
    
    return {model: JSONSourceModel.loadJSON('../data/' + source)};
  }

  onDataSelected = () => {
    this.setState(this.getNewState(this.state.listItem));
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

    /*let columnsMap = {};
    let source = this.props.list[this.state.listItem];
    if (['full.json', 'part-header.json'].indexOf(source) != -1) {
      const icon = {
        'psx': <img height={28} src={'../images/psx-logo-small.png'}/>,
        'gens': <img height={28} src={'../images/gens-logo-small.png'}/>,
        'snes': <img height={28} src={'../images/snes-logo-small.png'} />
      };
      columnsMap['type'] = {
        render: (s) => icon[s] || '?'
      };
      columnsMap['images'] = {
        render: (str: string, raw: Array<string>, row: number) => {
          return raw.map((item, i) => {
            return (
              <img
                key={i}
                height={100}
                src={['../data/files', this.state.model.getCell(3, row).value, item].join('/')}
              />
            );
          });
        }
      }
    }*/

    return (
      <FitToParent>
        <Table
          defaultRowHeight={100}
          //columnsMap={columnsMap}
          sourceModel={this.state.model}
          style={{position: 'absolute'}}/>
      </FitToParent>
    );
  }

  onFilter = () => {
    this.state.model.setConditions({
      op: 'or',
      condition: [
        {column: 'images', inverse: true, catValues: ['']}
      ]
    });
  };

  onFilterSnes = () => {
    this.state.model.setConditions({
      op: 'or',
      condition: [
        {column: 'type', textValue: 'psx'},
        {column: 'type', textValue: 'snes'}
      ]
    });
  };

  onClearFilter = () => {
    this.state.model.setConditions(null);
  };

  render() {
    return (
      <div style={{display: 'flex', flexGrow: 1, flexDirection: 'column'}}>
        <div style={{padding: 4}}>
          {this.renderDataList()}
          <button onClick={() => this.state.model.reload()}>reload</button>
          <button onClick={this.onFilter}>filter</button>
          <button onClick={this.onFilterSnes}>snes</button>
          <button onClick={this.onClearFilter}>clear</button>
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
