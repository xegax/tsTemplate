import * as ReactDOM from 'react-dom';
import * as React from 'react';
import {Table} from 'controls/table/simple-table';
import {getContainer} from 'examples-main/helpers';
import {TableData, TableInfo, TableCell, TableParams} from 'table/table-data';
import {IThenable} from 'promise';
import {Layout} from 'controls/layout/layout';
import * as Scheme from 'controls/layout/scheme';
import {VirtualTableData} from 'table/virtual-table-data';
import {loadTable} from 'table/server-table-data';

interface Props {
  table: TableData;
}

interface State {
  table: TableData;
}

class Test extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      table: props.table
    };
  }

  getScheme() {
    return {
      root: Scheme.column(
        Scheme.item('table')
      ).get()
    };
  }

  render() {
    return (
      <Layout scheme={this.getScheme()}>
        <Table key='table' tableData={this.state.table}/>
      </Layout>
    );
  }
}

let table = new VirtualTableData(1000, 400);
ReactDOM.render(<Test table={table} />, getContainer());
