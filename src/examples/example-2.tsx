import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Control} from 'controls/control';

let cont = document.createElement('div');
document.body.appendChild(cont);

ReactDOM.render(<Control text='Other'/>, cont);