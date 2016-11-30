import * as ReactDOM from 'react-dom';
import * as React from 'react'; 
import {ComboBox} from 'controls/combobox';
import {getContainer} from 'examples-main/helpers';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';

interface Props {
}

interface State {
}

class Example extends React.Component<Props, State> {
  render() {
    return (
      <div style={{flexGrow: 1}}>
        <div>combobox 1</div>
        <ComboBox sourceModel={new JSONPartialSourceModel('../data/part-header.json')} maxItems={20}/>
        <div>
          <ComboBox sourceModel={new JSONPartialSourceModel('../data/part-header.json')}/>
          <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
            {value: 'item 1'},
            {value: 'item 2'},
            {value: 'item 3'}
          ])}/>
          <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
            {value: 'item 1'},
            {value: 'item 2'}
          ])}/>
          <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
            {value: 'item 1'}
          ])}/>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Example/>, getContainer());