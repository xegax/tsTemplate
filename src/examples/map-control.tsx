import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {MapControl} from 'controls/map-control';

interface Props {
  width?: number;
  height?: number;
}

class Test extends React.Component<Props, {}> {
  render() {
    let {width, height} = this.props;
    return (
        <MapControl
          
          width={width}
          height={height}
          rows={100}
          columns={400}
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


ReactDOM.render(<FitToParent><Test/></FitToParent>, cont);