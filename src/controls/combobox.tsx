import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {TableSourceModel, TableModelEvent} from 'model/table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table';
import {FitToParent} from 'common/fittoparent';
import {findParentNode} from 'common/dom';
import {assign} from 'lodash';

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

  constructor(props) {
    super(props);
    this.state = {
      text: '',
      index: -1,
      popup: false,
      focus: false,
      items: 0
    };

    this.props.sourceModel.addSubscriber(this.watchTotal);
  }

  watchTotal = (mask: number) => {
    let total = this.props.sourceModel.getTotal();
    if (mask & TableModelEvent.TOTAL && this.state.items != total.rows) {
      this.setState({items: total.rows});
    }
  }

  showPopup(show: boolean) {
    this.setState({popup: show});
  }

  onSelect = (row: number, byMouse: boolean) => {
    if (!byMouse)
      return;

    this.showPopup(false);
    this.setState({index: row, text: this.props.sourceModel.getCell(0, row).value});
  }

  renderPopup() {
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
        <FitToParent width={this.node.offsetWidth} height={30 * 10 + 2}>
          <Table
            selectedRow={this.state.index}
            focus
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