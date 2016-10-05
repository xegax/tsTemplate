import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {GridControl} from 'controls/grid/grid-control';

interface Props {
  width?: number;
  height?: number;
  columns?: Array<number>
  rows: number;
}

class Test extends React.Component<Props, {}> {
  render() {
    let {width, height} = this.props;
    return (
        <GridControl
          aligned resizable
          width={width}
          height={height}
          rows={this.props.rows}
          columns={this.props.columns}
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
for(let n = 0; n < columns.length; n++) {
  columns[n] = 100 + (n % 5) * 10;
}

ReactDOM.render(<FitToParent><Test columns={columns} rows={999999}/></FitToParent>, cont);