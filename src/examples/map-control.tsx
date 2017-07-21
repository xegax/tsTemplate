import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';
import {MapControl} from 'controls/map/map-control';

interface Props {
  width?: number;
  height?: number;
}

interface State {
}

class Test extends React.Component<Props, State> {
  private map: MapControl;

  scrollToRow(row: number) {
    this.map.scrollToRow(row);
  }

  scrollToColumn(column: number) {
    this.map.scrollToColumn(column);
  }

  render() {
    const style: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      left: 0, top: 0, bottom: 0, right: 0
    };

    return (
      <div style={style}>
        <div style={{padding: 4}}>
          <button onClick={e => this.scrollToRow(0)}>
            row 0
          </button>
          <button onClick={e => this.scrollToColumn(0)}>
            column 0
          </button>
          <button onClick={e => this.scrollToRow(50)}>
            row 50
          </button>
          <button onClick={e => this.scrollToColumn(71)}>
            column 71
          </button>
          <button onClick={e => this.scrollToRow(999999)}>
            row 999999
          </button>
          <button onClick={e => this.scrollToColumn(999999)}>
            column 999999
          </button>
        </div>
        <div style={{flexGrow: 1}}>
          <FitToParent>
            <MapControl
              resizable alignedRows selectable
              renderHeader={(column) => ({ element: '[' + column + ']' })}
              style={{position: 'absolute'}}
              ref = {e => this.map = e}
              rows={100}
              columns={20}
            />
          </FitToParent>
        </div>
      </div>);
  }
}

let cont = createContainer();
cont.style.position = 'fixed';
cont.style.top = '50px';
cont.style.bottom = '5px';
cont.style.left = '5px';
cont.style.right = '5px';

ReactDOM.render(<Test/>, cont);
