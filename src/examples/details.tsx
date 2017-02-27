import * as React from 'react';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';

interface Props {
  model?: TableSourceModel
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

    props.model.getPublisher().addSubscriber((mask) => {
      if (mask & TableModelEvent.ROWS_SELECTED) {
        const data = [];

        const total = this.props.model.getTotal();
        const model = this.props.model;
        for (let n = 0; n < total.columns; n++) {
          const column = model.getColumn(n);
          const cell = model.getCell(n, this.props.row);
          data.push({name: column.id, value: cell.value});
        }
        this.setState({data});
      }
    });
  }

  componentWillReceiveProps(props: Props) {
    if (props.model != this.props.model)
      props.model.getPublisher().moveSubscribersFrom(this.props.model.getPublisher());
    if (props.row != this.props.row) {
      const total = props.model.getTotal();
      props.model.loadData({rows: [props.row, props.row], cols: [0, total.columns - 1]});
    }
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