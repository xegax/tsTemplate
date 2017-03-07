import * as React from 'react';
import {TableData} from 'table/table-data';

interface Props {
  model?: TableData
  row?: number;
  width?: number;
}

interface State {
  data?: Array<{name: string, value: string}>;
}

export class Details extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      data: []
    };
  }

  componentWillReceiveProps(props: Props) {
    let model = props.model;
    if (props.row == this.props.row && model == this.props.model)
      return;

    const info = model.getInfo();
    model.selectData([props.row, props.row]).then(() => {
      const data = [];  
      const columns = model.getColumns();
      for (let n = 0; n < info.colNum; n++) {
        const column = columns.getCell(n, 0);
        const cell = model.getCell(props.row, n);
        data.push({name: column.text, value: cell.text});
      }
      this.setState({data});
    });
  }

  render() {
    return (
      <div>
        <table width={this.props.width}>
          <tbody>
            {this.state.data.map((item, i) => {
              return (
                  <tr key={'row'+i}>
                    <td width={'1px'} style={{width: 1, backgroundColor: '#F0F0F0'}}>{item.name}</td>
                    <td>{item.value}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}