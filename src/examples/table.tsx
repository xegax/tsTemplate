import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {createContainer} from 'examples-main/helpers';
import {MapControl} from 'controls/map-control';
import {GridControl} from 'controls/grid-control';
import * as d3 from 'd3';
import {FitToParent} from 'common/fittoparent';

interface Props {
  model: Model;
}

interface State {
  columnSizes?: Array<number>;
}

interface Cell {
  element: JSX.Element | string;
  className?: string;
}

interface Model {
  getColumnsRange(columns: Array<number>): Array<string>;
  getCellsRange(columns: Array<number>, rows: Array<number>): Array<Array<string>>;
  getColumnsNum(): number;
  getRowsNum(): number;
}

function makeJSONArrayModel(data: Array<{[key: string]: string}>, colNames?: Array<string>): Model {
  if (!colNames)
    colNames = Object.keys(data[0]);

  let model: Model = {
    getColumnsRange: (range: Array<number>) => colNames.slice(range[0], range[1] + 1),
    getCellsRange: (columns: Array<number>, rows: Array<number>) => {
      let cells = Array<Array<string>>(columns[1] - columns[0] + 1);
      for (let c = 0; c < cells.length; c++) {
        let rowArr = cells[c] = Array<string>(rows[1] - rows[0] + 1);
        for (let r = 0; r < rowArr.length; r++) {
          try {
            rowArr[r] = '' + data[r + rows[0]][colNames[c + columns[0]]];
          } catch(e) {
            console.log(e);
          }
        }
      }
      return cells;
    },
    getColumnsNum: () => colNames.length,
    getRowsNum: () => data.length
  };

  return model;
}

class Test extends React.Component<Props, State> {
  private cells = Array<Array<string>>();
  private header = Array<string>();
  private columns = Array<number>();
  private rows = Array<number>();

  constructor(props: Props) {
    super(props);
    this.state = {
      columnSizes: this.makeColumnSizes(props)
    };
  }

  makeColumnSizes(props: Props) {
    let columns = props.model.getColumnsNum();
    let columnSizes = Array<number>(columns);
    for (let n = 0; n < columnSizes.length; n++) {
      columnSizes[n] = 150;
    }

    return columnSizes;
  }

  componentWillReceiveProps(newProps: Props) {
    let columnSizes = this.makeColumnSizes(newProps);
    this.setState({columnSizes});
  }

  onUpdate = (eventMask) => {
    this.forceUpdate();
  }

  onChanged = (event) => {
    this.columns = event.columns.slice();
    this.rows = event.rows.slice();
    this.cells = this.props.model.getCellsRange(this.columns, this.rows);
    this.header = this.props.model.getColumnsRange(this.columns);
    this.forceUpdate();
  }

  renderCell = (column, row) => {
    if (column >= this.columns[0] && column <= this.columns[1]) {
      if (row >= this.rows[0] && row <= this.rows[1]) {
        let cell = this.cells[column - this.columns[0]][row - this.rows[0]];
        return {
          element: <div style={{padding: 3}}>{cell}</div> as any
        };
      }
    }

    return {
      element: '?'
    }
  }

  renderHeader = (column) => {
    return {element: this.header[column - this.columns[0]]};
  }

  renderMapControl() {
    let {model} = this.props;
    let columns = model.getColumnsNum();
    let rows = model.getRowsNum();
    return (
      <FitToParent>
        <MapControl
          selectable resizable alignedRows
          onChanged={this.onChanged}
          renderCell={this.renderCell}
          renderHeader={this.renderHeader}
          columns={columns}
          rows={rows}
          cellHeight={46}
          cellWidth={300}
        />
      </FitToParent>
    );
  }

  renderGridControl() {
    let {model} = this.props;
    let {columnSizes} = this.state;
    let columns = model.getColumnsNum();
    let rows = model.getRowsNum();
    return (
      <FitToParent>
        <GridControl
          aligned resizable
          onChanged={this.onChanged}
          renderCell={this.renderCell}
          renderHeader={this.renderHeader}
          rows={rows}
          columns={columnSizes}
          cellHeight={46}
        />
      </FitToParent>
    );
  }

  render() {
    return this.renderGridControl();
  }
}


interface Data {
  title: string;
  file: string;
  type: string;
  images: Array<string>;
}

d3.json('../src/data/full.json', (err, data: Array<{[key: string]: string}>) => {
  ReactDOM.render(<Test model={makeJSONArrayModel(data)}/>, createContainer(null, 700));
});