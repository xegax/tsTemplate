import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {RowGroup, ColumnGroup} from 'controls/layout';
import {Align} from 'common/common';

class Test extends React.Component<{}, {}> {
  render() {
    return (
      <ColumnGroup grow>
        <RowGroup margin={0}>
          <button>one</button>
          <button>two</button>
          <button>three</button>
        </RowGroup>
        <RowGroup margin={5}>
          <button>one</button>
          <button>two</button>
          <button>three</button>
        </RowGroup>
        <RowGroup margin={10}>
          <button>one</button>
          <button>two</button>
          <button>three</button>
        </RowGroup>
        <RowGroup align={Align.Middle}>
          <button>eight</button>
          <button>nine</button>
          <button>ten</button>
        </RowGroup>
        <RowGroup align={Align.Right}>
          <button>five</button>
          <button>six</button>
          <button>seven</button>
        </RowGroup>
      </ColumnGroup>
    );
  }
}

ReactDOM.render(<Test/>, getContainer());