import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {TableSourceModel} from 'model/table-source-model';
import {className} from 'common/common';
import {Table} from 'controls/table';
import {FitToParent} from 'common/fittoparent';

const classes = {
  combobox: 'combobox',
  focus: 'combobox__focus',
  textbox: 'combobox__textbox'
};

interface Props {
  defaultValue?: number;
  sourceModel: TableSourceModel;
  width?: number;
  height?: number;
}

interface State {
  index?: number;
  text?: string;
  popup?: boolean;
  focus?: boolean;
}

export class ComboBox extends React.Component<Props, State> {
  input: HTMLInputElement;
  node: HTMLElement;

  constructor(props) {
    super(props);
    this.state = {
      text: '',
      index: -1,
      popup: false,
      focus: false
    };
  }

  showPopup(show: boolean) {
    this.setState({popup: show});
  }

  onSelect = (row: number) => {
    if (row == this.state.index)
      return;

    this.showPopup(false);
    this.setState({index: row, text: this.props.sourceModel.getCell(0, row).value});
    console.log(row);
  }

  renderPopup() {
    if (!this.state.popup)
      return null;
    return (
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          marginLeft: -1,
          marginTop: this.node.offsetHeight - 2,
          width: this.node.offsetWidth,
          height: 30 * 10 + 2,
          border: '1px solid black',
          boxSizing: 'border-box',
          backgroundColor: 'white'}}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <FitToParent>
          <Table
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

  render() {
    const style = {
      width: this.props.width,
      height: this.props.height
    };
    return (
      <div ref={ref => this.node = ref} style={style} className={className(classes.combobox, this.state.focus && classes.focus)}>
        <input
          ref={ref => this.input = ref}
          className={classes.textbox}
          type='text'
          value={this.state.text}
          onClick={e => this.showPopup(true)}
          onFocus={e => this.setState({focus: true})}
          onBlur={e => this.setState({focus: false, popup: false})}
        />
        {this.renderPopup()}
      </div>
    );
  }
}