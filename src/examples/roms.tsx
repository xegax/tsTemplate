import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Table, Column} from 'controls/table';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';
import {TableSourceModel} from 'model/table-source-model';
import {FitToParent} from 'common/fittoparent';
import {Requestor} from 'requestor/requestor';

interface Props {
  url: string;
  width?: number;
  height?: number;
}

interface State {
  sourceModel?: OrderedColumnsSourceModel;
  columnsMap?: {[colId: string]: Column};
  images?: Array<string>;
}

class Roms extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      sourceModel: null,
      columnsMap: {}
    };

    this.state.sourceModel = new OrderedColumnsSourceModel(JSONSourceModel.loadJSON(props.url), [
      {
        colIdx: 0,
        id: 'recNo',
        mapper: (row: number) => ({value: '' + (row + 1), raw: '' + row})
      }, {
        colIdx: 0,
        id: 'name'
      }, {
        colIdx: 2,
        id: 'img',
        mapper: (row, cell) => cell.raw && cell.raw.length ? {value: '[img]', raw: ''} : {value: '', raw: ''}
      }, {
        colIdx: 3,
        id: 'platform'
      }
    ]);

    this.state.columnsMap = {
      'recNo': {
        width: 50,
        tooltip: 'index of record'
      },
      'img': {
        width: 50,
      },
      'platform': {
        width: 60,
        render: (s) => <div style={{textAlign: 'center'}}><img src={'../images/' + s + '-logo-small.png'}/></div>
      }
    };
  }

  onSelectRow = (row: number) => {
    let origSource = this.state.sourceModel.getSourceModel();
    let type = origSource.getCellByColName('type', row).value;
    let images: Array<string> = origSource.getCellByColName('images', row).raw;

    images = images.map(item => ['../data/files', type, item].join('/'));
    this.setState({images});
  };

  render() {
    return (
      <div style={{flexGrow: 1, display: 'flex'}}>
        <div style={{flexGrow: 1}}>
          <FitToParent>
            <Table
              width={this.props.width}
              height={this.props.height}
              sourceModel={this.state.sourceModel}
              columnsMap={this.state.columnsMap}
              onSelect={this.onSelectRow}
              style={{position: 'absolute'}}
            />
          </FitToParent>
        </div>
        <div style={{width: 400, backgroundColor: 'silver'}}>
          {this.state.images && this.state.images.map((item, i) => <img key={i} src={item}/>)}
        </div>
      </div>
    );
  }
}

ReactDOM.render(<FitToParent><Roms url={'../data/full.json'}/></FitToParent>, getContainer());