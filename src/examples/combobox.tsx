import * as ReactDOM from 'react-dom';
import * as React from 'react'; 
import {ComboBox} from 'controls/combobox';
import {getContainer} from 'examples-main/helpers';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';

interface Props {
}

interface State {
}

class Example extends React.Component<Props, State> {
  render() {
    return (
      <div style={{flexGrow: 1}}>
        <div>combobox 1</div>
        <ComboBox sourceModel={new JSONPartialSourceModel('../data/part-header.json')}/>
      </div>
    );
  }
}

ReactDOM.render(<Example/>, getContainer());