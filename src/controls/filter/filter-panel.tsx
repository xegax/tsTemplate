import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {TableSourceModel, Column} from 'model/table-source-model';
import {Table} from 'controls/table/simple-table';
import {JSONSourceModel} from 'model/json-source-model';
import {FitToParent} from 'common/fittoparent';
import {Dialog} from 'controls/dialog';
import {ComboBox} from 'controls/combobox';
import {KeyCode} from 'common/keycode';
import {FilterModel, FilterItem, FilterList} from 'controls/filter/filter-model';

const EditItem = {column: '', value: ''};

interface Props {
  dataSource: TableSourceModel;
  size?: {width?: number, height?: number};
  model: FilterModel;
}

interface State {
  dataSource?: TableSourceModel;
  columns?: Array<string>;
  editItem?: FilterItem;
  editIdx?: number;
  editList?: FilterList;
}

const classes = {
  panel: 'filter_panel',
  columns: 'filter_panel--columns',
  filters: 'filter_panel--filters',
  filtersWrap: 'filter_panel--filters--wrap',
  wrap: 'filter_panel--wrap',
  buttons: 'filter_panel--buttons',
  itemWrapper: 'filter_panel--item_wrapper',
  itemLabel: 'filter_panel--item_label',
  addControl: 'filter_panel--add_control'
};

export class FilterPanel extends React.Component<Props, State> {
  static defaultProps = {
    size: {height: 290}
  };
  columnCtrl: HTMLInputElement;
  valueCtrl: HTMLInputElement;
  onModelDidUpdate = () => {
    this.forceUpdate();
  };

  constructor(props: Props) {
    super(props);

    let total = props.dataSource.getTotal();
    let columns = Array<Column>();
    for (let n = 0; n < total.columns; n++) {
      columns.push(props.dataSource.getColumn(n));
    }

    const strColumns = columns.map(col => col.id);
    this.state = {
      columns: strColumns,
      dataSource: new JSONSourceModel(columns.map(col => [col.id]), ['name'])
    };
  }

  componentDidMount() {
    this.props.model.addSubscriber(this.onModelDidUpdate);
  }

  componentWillUnmount(){
    this.props.model.removeSubscriber(this.onModelDidUpdate);
  }

  renderTable(name: string, list: FilterList, allIfEmpty: boolean) {
    const items = list.getItems();
    let lst = items.map((item, i) => this.renderItem(list, items[i], i));
    if (allIfEmpty && lst.length == 0)
      lst = [<div>*</div>];

    lst = [
      <div key='header'>{name}</div>
    ].concat(lst);
    if (this.state.editList == list && this.state.editItem && this.state.editIdx == -1)
      lst.push(this.renderItem(list, this.state.editItem, -1));

    lst.push(<div
      className={classes.addControl}
      key={lst.length}
      onClick={e => {
        this.setState({
          editItem: {column: '', value: ''},
          editIdx: -1,
          editList: list
        });
      }}>
        +Item
      </div>
    );

    return lst;
  }

  renderItem(list: FilterList, item: FilterItem, idx: number) {
    if (this.state.editItem && list == this.state.editList && this.state.editIdx == idx)
      return this.renderEditItem(list, idx);

    return (
      <div key={`wr${idx}`} className={classes.itemWrapper}>
        <i className='fa fa-edit'
          onClick={e => {
            this.setState({
              editItem: {
                column: item.column,
                value: item.value
              },
              editIdx: idx,
              editList: list
            });
          }}
        />
        <div className={classes.itemLabel} key={idx}>{`[${item.column}] = ${item.value}`}</div>
        <i className='fa fa-close'
          onClick={e => {
            if (idx != -1)
              list.removeItem(idx);
            this.setState({editItem: null});
          }}
        />
      </div>
    );
  }

  renderEditItem(list: FilterList, idx: number) {
    let editItem = this.state.editItem;
    const onFinish = () => {
      if (idx == -1) {
        list.addItem(editItem.column, editItem.value);
      } else {
        list.setItem(idx, editItem.column, editItem.value);
      }
      this.setState({editItem: null});
    };
    
    return (
        <div>
          [
            <ComboBox
              style={{display: 'inline-block', width: 100}}
              sourceModel={this.state.dataSource} 
              sourceRow={editItem.column != '' ? this.state.columns.indexOf(editItem.column): 0}
              defaultFocus
              defaultPopup
              onSelect={(value, row) => {
                editItem.column = value;
                this.valueCtrl.focus();
              }}/>
          ]=
          <input
            ref={e => this.valueCtrl = e}
            defaultValue={editItem.value}
            onChange={e => editItem.value = this.valueCtrl.value}
            onKeyDown={e => e.keyCode == KeyCode.Enter && onFinish()}/>
          <i className='fa fa-check-square-o' onClick={() => onFinish()}/>
        </div>
      );
  }

  render() {
    return (
      <div>
        <div className={classes.panel} style={this.props.size}>
          <div className={classes.columns}>
            {this.renderTable('include', this.props.model.getInclude(), true)}
          </div>
          <div className={classes.filters}>
            {this.renderTable('exclude', this.props.model.getExclude(), false)}
          </div>
        </div>
        <div>
          <button>apply</button>
        </div>
      </div>
    );
  }
}