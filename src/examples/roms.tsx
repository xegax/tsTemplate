import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Table} from 'controls/table/simple-table';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {TableSourceModel, ColumnType} from 'model/table-source-model';
import {FitToParent} from 'common/fittoparent';
import {Requestor} from 'requestor/requestor';

interface Props {
  width?: number;
  height?: number;
}

interface State {
  sourceModel?: TableSourceModel;
  images?: Array<string>;
}

class Roms extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      sourceModel: null
    };

    this.initFull(props);
  }

  private initPs(props: Props) {
    this.state.sourceModel = JSONSourceModel.loadJSON('../data/ps-detailed.json');
  }

  private initFull(props: Props) {
    this.state.sourceModel = JSONSourceModel.loadJSON('../data/full.json');
  }


  onSelectRow = (row: number) => {
    /*let origSource = this.state.sourceModel.getSourceModel();
    let type = origSource.getCell(origSource.getColumnIdx('type'), row).value;
    let images: Array<string> = origSource.getCell(origSource.getColumnIdx('images'), row).raw || [];

    images = images.map(item => ['../data/files', type, item].join('/'));
    this.setState({images});*/
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

ReactDOM.render(<FitToParent><Roms/></FitToParent>, getContainer());