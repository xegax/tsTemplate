import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {TableData} from 'table/table-data';
import {className} from 'common/common';
import {Table} from 'controls/table/simple-table';
import {FitToParent} from 'common/fittoparent';
import {findParentNode} from 'common/dom';
import {assign} from 'lodash';
import {GridModel, GridModelFeatures} from 'controls/grid/grid-model';
import {KeyCode} from 'common/keycode';
import {TextBox} from 'controls/textbox';

const classes = {
  combobox: 'combobox',
  focus:    'combobox__focus',
  textbox:  'combobox__textbox',
  list:     'combobox__list',
  popup:    'combobox__popup'
};

interface Props {
  tableData: TableData;
  debug?: boolean;
  
  sourceRow?: number;
  textValue?: string;

  maxItems?: number;
  defaultFocus?: boolean;
  defaultPopup?: boolean;

  onSelect?: (value: string, row: number) => boolean | void;
  onBlur?: () => void;

  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

interface State {
  index?: number;
  text?: string;
  popup?: boolean;
  focus?: boolean;
  items?: number;
  tableData?: TableData;
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

    if (props.tableData) {
      let info = props.tableData.getInfo();
      this.state.items = info.rowNum;
      this.state.tableData = props.tableData;
      this.updateTable(props.tableData);
    }
  }

  private updateTable(table: TableData) {
    let info = table.getInfo();
    if (info.rowNum != this.state.items) {
      this.setState({items: info.rowNum});
    }

    let startRow = 0;
    if (this.props.sourceRow != null)
      startRow = this.props.sourceRow;
    
    table.selectData([startRow, startRow + this.props.maxItems], [0, 0])
      .then(() => {
        this.setState({text: table.getCell(startRow, 0).text});
      });
  }

  componentDidMount() {
    this.gridViewModel.setWidth(this.node.offsetWidth);
    if (this.props.defaultPopup)
      this.showPopup(true);
    if (this.props.defaultFocus)
      this.input.focus();
  }

  componentWillReceiveProps(newProps: Props) {
    if (this.state.tableData != newProps.tableData) {
      this.setState({tableData: newProps.tableData});
      this.updateTable(newProps.tableData);
    }
  }

  protected showPopup(show: boolean) {
    this.setState({popup: show});
  }

  protected onSelect = (row: number) => {
    let close = true;
    try {
      if (this.props.onSelect)
        close = !(this.props.onSelect(this.state.tableData.getCell(row, 0).text, row) === false);
    } catch(e) {
      console.log('ComboBox, onSelect', e);
    }

    this.showPopup(!close);
    this.setState({index: row, text: this.state.tableData.getCell(row, 0).text});
  }

  protected renderPopup() {
    if (!this.state.tableData || !this.state.popup || this.state.items == 0)
      return null;

    const rowH = this.node.offsetHeight;
    let height = rowH * Math.min(this.state.items, this.props.maxItems) + 2;
    return (
      <div
        className={classes.popup}
        style={{
          zIndex: 1000,
          width: this.node.offsetWidth,
          height: height
        }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FitToParent width={this.node.offsetWidth} height={height}>
          <Table
            viewModel={this.gridViewModel}
            onSelect={this.onSelect}
            className={classes.list}
            header={false}
            defaultRowHeight={rowH}
            defaultSelectedRow={this.state.index}
            defaultFeatures={GridModelFeatures.ROWS_HIGHLIGHTABLE | GridModelFeatures.ROWS_SELECTABLE}
            tableData={this.state.tableData}
          />
        </FitToParent>
      </div>
    );
  }

  protected onBlur = (e: React.FocusEvent) => {
    if (this.props.debug)
      return;

    if(findParentNode(e.relatedTarget as any, this.node) == true)
      return;

    this.props.onBlur && this.props.onBlur();
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
        this.gridViewModel.setRowSelect(this.gridViewModel.getHighlightRow(), true);
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
          <TextBox
            ref={ref => this.input = ref}
            className={classes.textbox}
            value={this.state.text}
            onClick={e => this.showPopup(true)}
          />
        </div>
        {this.renderPopup()}
      </div>
    );
  }
}