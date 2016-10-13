import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {GridControl} from 'controls/grid/grid-control';
import {GridModel} from 'controls/grid/grid-model';

interface Props {
  width?: number;
  height?: number;
  model: GridModel;
}

class Test extends React.Component<Props, {}> {
  render() {
    let {width, height} = this.props;
    return (
        <GridControl
          resizable
          width={width}
          height={height}
          model={this.props.model}
        />
      );
  }
}

let cont = createContainer();
cont.style.position = 'fixed';
cont.style.top = '50px';
cont.style.bottom = '5px';
cont.style.left = '5px';
cont.style.right = '5px';

let columns = Array<number>(5000);
for (let n = 0; n < columns.length; n++) {
  columns[n] = 100 + (n % 5) * 10;
}

let model = new GridModel();
model.setColumns(columns);
model.setRows(9999999);

ReactDOM.render(<FitToParent><Test model={model}/></FitToParent>, cont);
