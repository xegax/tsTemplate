import * as ReactDOM from 'react-dom';
import * as React from 'react'; 
import {ComboBox} from 'controls/combobox';
import {getContainer} from 'examples-main/helpers';
import {JSONPartialSourceModel} from 'model/json-partial-source-model';
import {JSONSourceModel} from 'model/json-source-model';
import {ColumnGroup, RowGroup} from 'controls/layout';

interface Props {
}

interface State {
  
}

let source1 = new JSONPartialSourceModel('../data/part-header.json');

class Example extends React.Component<Props, State> {
  comboVals = Array<{value: string, row: number}>();
  
  render() {
    return (
      <div style={{flexGrow: 1}}>
        <ColumnGroup>
          <ColumnGroup>
            <div>{JSON.stringify(this.comboVals[0] || '')}</div>
            <ComboBox
              sourceModel={source1}
              maxItems={20}
              sourceRow={3000}
              onSelect={(value, row) => {
                this.comboVals[0] = {value, row};
                this.forceUpdate();
              }}
            />
          </ColumnGroup>
          <ColumnGroup>
            <div>{JSON.stringify(this.comboVals[1] || '')}</div>
            <ComboBox
              sourceRow={1000}
              sourceModel={source1}
              onSelect={(value, row) => {
                this.comboVals[1] = {value, row};
                this.forceUpdate();
              }}
            />
            <ComboBox
              sourceModel={source1}
            />
            <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
              ['item 1'],
              ['item 2'],
              ['item 3']
            ], ['value'])}/>
            <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
              ['item 1'],
              ['item 2']
            ], ['value'])}/>
            <ComboBox style={{display: 'inline-block', width: 100}} sourceModel={new JSONSourceModel([
              ['item 1']
            ], ['value'])}/>
          </ColumnGroup>
        </ColumnGroup>
      </div>
    );
  }
}

ReactDOM.render(<Example/>, getContainer());