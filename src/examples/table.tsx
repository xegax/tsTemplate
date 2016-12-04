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
import {className} from 'common/common';
import {Table} from 'controls/table';

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

    let columnRender = [];
    let source = this.props.list[this.state.listItem];
    if (['full.json', 'part-header.json'].indexOf(source) != -1) {
      const icon = {
        'psx': <img height={28} src={'../images/psx-logo-small.png'}/>,
        'gens': <img height={28} src={'../images/gens-logo-small.png'}/>,
        'snes': <img height={28} src={'../images/snes-logo-small.png'} />
      };
      columnRender[3] = (s) => icon[s] || '?';
      columnRender[2] = (str: string, raw: Array<string>, row: number) => {
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

    return (
      <FitToParent>
        <Table rowHeight={100} columnRender={columnRender} sourceModel={this.state.model} style={{position: 'absolute'}}/>
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
ReactDOM.render(<DataSelector list={['full.json', 'gens.json', 'part-header.json', 'test-900000x1000']}/>, getContainer());
