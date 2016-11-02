import * as React from 'react';
import {getContainer} from 'examples-main/helpers';
import {ComponentContainer} from 'controls/component-container';

function addRow(cont: ComponentContainer, n: number) {
  let id = cont.push(<div onClick={e => cont.remove(id)}>{'row ' + n}</div>);
}

let cont = new ComponentContainer(getContainer());
for (let n = 0; n < 10; n++) {
  addRow(cont, n);
}