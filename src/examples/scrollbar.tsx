import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {VerticalScrollbar, HorizontalScrollbar} from 'controls/scrollbar';
import {createContainer} from 'examples-main/helpers';
import {FitToParent} from 'common/fittoparent';

class Test extends React.Component<{}, {}> {
  render() {
    return (
      <div style={{display: 'flex', flexDirection: 'column', height: 500}}>
        <div style={{flexGrow: 1, backgroundColor: 'silver'}}></div>
        <div style={{flexGrow: 1, minHeight: 16, maxHeight: 16}}>
          <FitToParent>
            <HorizontalScrollbar/>
          </FitToParent>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Test/>, createContainer());