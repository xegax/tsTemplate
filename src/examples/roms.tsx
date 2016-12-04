import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Table, Column} from 'controls/table';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {OrderedColumnsSourceModel} from 'model/ordered-columns-source-model';
import {TableSourceModel} from 'model/table-source-model';
import {FitToParent} from 'common/fittoparent';

interface Props {
  url: string;
  width?: number;
  height?: number;
}

interface State {
  origSourceModel?: TableSourceModel;
  sourceModel?: TableSourceModel;
  columnsMap?: {[idx: number]: Column};
  images?: Array<string>;
}

class Roms extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      origSourceModel: new JSONPartialSourceModel(props.url),
      sourceModel: null,
      columnsMap: []
    };
    this.state.sourceModel = new OrderedColumnsSourceModel(this.state.origSourceModel, [0, 0, 2, 3], {
      0: (row: number) => ({value: '' + (row + 1), raw: '' + row}),
      2: (row, cell) => cell.raw && cell.raw.length ? {value: '[img]', raw: ''} : {value: '', raw: ''}
    });

    this.state.columnsMap = {
      0: {
        width: 50
      },
      2: {
        width: 50,
      },
      3: {
        width: 60,
        render: (s) => <div style={{textAlign: 'center'}}><img src={'../images/' + s + '-logo-small.png'}/></div>
      }
    };
  }

  onSelectRow = (row: number) => {
    let type = this.state.origSourceModel.getCell(3, row).value;
    let images: Array<string> = this.state.origSourceModel.getCell(2, row).raw;
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

ReactDOM.render(<FitToParent><Roms url={'../data/part-header.json'}/></FitToParent>, getContainer());