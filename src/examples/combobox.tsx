import * as ReactDOM from 'react-dom';
import * as React from 'react'; 
import {ComboBox} from 'controls/combobox';
import {getContainer} from 'examples-main/helpers';
import {JSONTableData} from 'table/json-table-data';
import {ColumnGroup, RowGroup} from 'controls/layout';

interface Props {
}

interface State {
  
}

let source1 = new JSONTableData([
  ['111'],
  ['222'],
  ['333'],
  ['444'],
  ['555']
], ['?']);

let source2 = new JSONTableData([
  ['item 1'],
  ['item 2'],
  ['item 3']
], ['?']);

class Example extends React.Component<Props, State> {
  comboVals = Array<{value: string, row: number}>();
  
  render() {
    return (
      <div style={{flexGrow: 1}}>
        <ColumnGroup>
          <ColumnGroup>
            <div>{JSON.stringify(this.comboVals[0] || '')}</div>
            <ComboBox
              tableData={source1}
              maxItems={20}
              sourceRow={3}
              onSelect={(value, row) => {
                this.comboVals[0] = {value, row};
                this.forceUpdate();
              }}
            />
          </ColumnGroup>
          <ColumnGroup>
            <div>{JSON.stringify(this.comboVals[1] || '')}</div>
            <ComboBox
              sourceRow={2}
              tableData={source1}
              onSelect={(value, row) => {
                this.comboVals[1] = {value, row};
                this.forceUpdate();
              }}
            />
            <ComboBox
              tableData={source1}
            />
            <ComboBox style={{display: 'inline-block', width: 100}} tableData={source2}/>
            <ComboBox style={{display: 'inline-block', width: 100}} tableData={new JSONTableData([
              ['item 1'],
              ['item 2']
            ], ['value'])}/>
            <ComboBox style={{display: 'inline-block', width: 100}} tableData={new JSONTableData([
              ['item 1']
            ], ['value'])}/>
          </ColumnGroup>
        </ColumnGroup>
      </div>
    );
  }
}

ReactDOM.render(<Example/>, getContainer());