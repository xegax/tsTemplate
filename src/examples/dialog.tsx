import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {Dialog} from 'controls/dialog';

let count = 0;
function showDialog() {
  count++;
  let ctrl = Dialog.showModal(
    <div>
      <div>{'test' + count}</div>
      <div>
        <button onClick={showDialog}>open</button>
        <button onClick={e => ctrl.close()}>close</button>
      </div>
    </div>, {title: 'title', onClosed: () => console.log('closed!')}
  );
}

ReactDOM.render(<div><button onClick={showDialog}>show dialog</button></div>, getContainer());
