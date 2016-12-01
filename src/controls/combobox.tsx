import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table';
import {FitToParent} from 'common/fittoparent';
import {findParentNode} from 'common/dom';
import {assign} from 'lodash';
import {GridModel} from 'controls/grid/grid-model';
import {KeyCode} from 'common/keycode';

const classes = {
  combobox: 'combobox',
  focus: 'combobox__focus',
  textbox: 'combobox__textbox'
};

interface Props {
  sourceModel: TableSourceModel;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  maxItems?: number;
  
  sourceRow?: number;
  textValue?: string;

  onSelect?: (value: string, row: number) => void;
}

interface State {
  index?: number;
  text?: string;
  popup?: boolean;
  focus?: boolean;
  items?: number;
}

export class ComboBox extends React.Component<Props, State> {
  static defaultProps = {
    maxItems: 10
  };

  input: HTMLInputElement;
  node: HTMLElement;
  gridViewModel = new GridModel();

  constructor(props: Props) {
    super(props);
    this.state = {
      text: '',
      index: props.sourceRow != null ? props.sourceRow : -1,
      popup: false,
      focus: false,
      items: 0
    };

    this.props.sourceModel.addSubscriber(this.watchTotal);
  }

  protected watchTotal = (mask: number) => {
    let total = this.props.sourceModel.getTotal();
    if (mask & TableModelEvent.TOTAL && this.state.items != total.rows) {
      this.setState({items: total.rows});
    }

    if (this.props.sourceRow == null)
       return;

    if (mask & TableModelEvent.TOTAL) {
      this.props.sourceModel.loadData({
        rows: [this.props.sourceRow, this.props.sourceRow + this.props.maxItems],
        cols: [0, 1]
      }).then(() => {
        this.setState({text: this.props.sourceModel.getCell(0, this.props.sourceRow).value});
      });
    }
  }

  componentDidMount() {
    this.gridViewModel.setWidth(this.node.offsetWidth);
  }

  protected showPopup(show: boolean) {
    this.setState({popup: show});
  }

  protected onSelect = (row: number) => {
    if (this.props.sourceRow == row)
      return;
    
    this.showPopup(false);
    this.setState({index: row, text: this.props.sourceModel.getCell(0, row).value});
    this.props.onSelect && this.props.onSelect(this.props.sourceModel.getCell(0, row).value, row);
  }

  protected renderPopup() {
    if (!this.state.popup || this.state.items == 0)
      return null;

    let height = 30 * Math.min(this.state.items, this.props.maxItems) + 2;
    return (
      <div
        style={{
          zIndex: 1000,
          display: 'flex',
          position: 'absolute',
          left: 0,
          marginLeft: -1,
          width: this.node.offsetWidth,
          height: height,
          border: '1px solid black',
          boxSizing: 'border-box',
          backgroundColor: 'white'}}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FitToParent width={this.node.offsetWidth} height={height}>
          <Table
            viewModel={this.gridViewModel}
            selectedRow={this.state.index}
            onSelect={this.onSelect}
            className='combo-list'
            header={false}
            sourceModel={this.props.sourceModel}
          />
        </FitToParent>
      </div>
    );
  }

  protected onBlur = (e: React.FocusEvent) => {
    if(findParentNode(e.relatedTarget as any, this.node) == true)
      return;
    this.showPopup(false);
  };

  protected onKeyDown = (e: React.KeyboardEvent) => {
    let keyCode = e.keyCode;

    let rowOffs = 0;
    if (keyCode == KeyCode.ArrowUp) {
      rowOffs = -1;
    } else if (keyCode == KeyCode.ArrowDown) {
      rowOffs = 1;
    } else if (keyCode == KeyCode.Enter) {
      if (this.state.popup == false) {
        this.showPopup(true);
      } else {
        this.gridViewModel.setSelectRow(this.gridViewModel.getHighlightRow(), true);
      }
    } else if (keyCode == KeyCode.Escape) {
      this.showPopup(false);
    }

    if (rowOffs)
      this.gridViewModel.setHighlightRow(this.gridViewModel.getHighlightRow() + rowOffs, true);
  };

  render() {
    const style = assign({}, this.props.style, {
      width: this.props.width,
      height: this.props.height,
      position: 'relative'
    });

    return (
      <div
        ref={ref => this.node = ref}
        style={style}
        className={className(classes.combobox, this.state.focus && classes.focus)}
        onBlur={this.onBlur}
        onKeyDown={this.onKeyDown}
      >
        <div style={{display: 'flex'}}>
          <input
            ref={ref => this.input = ref}
            className={classes.textbox}
            type='text'
            value={this.state.text}
            onClick={e => this.showPopup(true)}
          />
        </div>
        {this.renderPopup()}
      </div>
    );
  }
}