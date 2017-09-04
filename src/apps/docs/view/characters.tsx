import * as React from 'react';
import {ObjID, CharacterTable, Character, ListObj} from '../model/document';
import {ExtTable, WrapCell} from 'controls/table/ext-table';
import {TableData, VirtualTableData} from 'table/virtual-table-data';
import {Layout, Scheme} from 'controls/layout/layout';
import {Queue} from 'common/promise';
import {TextBox} from 'controls/textbox';
import {Menu} from 'controls/menu';

interface Props {
  table: CharacterTable;
  createObject: (name: string, args?: Array<any>) => Promise<ObjID>;
}

interface State {
  scheme?: {root: Scheme.Scheme};
  table?: TableData;
  editItem?: {ref: Character, col: number};
}

function makeTableData(chars: CharacterTable): Promise<TableData> {
  const lst = chars.getList();
  return new Promise((resolve, reject) => {
    const table = new VirtualTableData(lst.getLength(), 2, (r, c) => {
      const char = lst.get(r);
      if (char) {
        const text = getValue(char, c);
        return {text, raw: text};
      } else {
        return {text: '?', raw: '?'};
      }
    }, (rows, cols) => lst.selectRange(rows[0], rows[1] - rows[0] + 1),
    ListObj.ITEMS_PER_CACHE);
    const sel = lst.getSelected();
    
    table.selectData([sel.from, sel.from + sel.count - 1]).then(() => {
      setTimeout(() => resolve(table), 1);
    });
  });
}

function getValue(char: Character, col: number) {
  const lst = [char.getName(), char.getDescr()];

  if (col > lst.length)
    throw `invalid column index = ${col}`;

  return lst[col].toString();
}

function setValue(char: Character, col: number, val: string) {
  if (col == 0) {
    char.setName(val);
  } else if (col == 1) {
    char.setDescr(val);
  }
}

export class CharacterView extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    let scheme: Scheme.Scheme;
    try {
      scheme = JSON.parse(props.table.getLayout());
    } catch(e) {
    }

    this.state = {
      scheme: {
        root: scheme || Scheme.column(
          Scheme.item('append'),
          Scheme.row(Scheme.item('table'))
        ).get()
      }
    };

    this.updateTable();
  }

  renderTable() {
    return (
      <ExtTable
        key='table'
        tableData={this.state.table}
        wrapCell={this.wrapCell}
      />
    );
  }

  private addItem = () => {
    const lst = this.props.table.getList();
    Queue.all(
      () => this.props.createObject(Character.getDesc().classId, [{name: 'item ' + lst.getLength()}]),
      (item: Character) => lst.append(item),
      () => this.updateTable()
    );
  };

  renderAppend() {
    return (
      <div key='append'>
        <div style={{cursor: 'pointer'}} onClick={this.addItem}>+row</div>
      </div>
    );
  }

  onEditItem = (ref: Character, col: number) => {
    this.setState({
      editItem: {ref, col}
    });
  }

  onContextMenu = (ref: Character, row: number, evt: React.MouseEvent<HTMLElement>) => {
    const items = [
      {
        label: 'delete',
        command: () => {
          this.props.table.getList().remove(row).then(() => this.updateTable());
        }
      }
    ];
    Menu.showAt({x: evt.pageX, y: evt.pageY}, <Menu items={items}/>);
  }

  private updateTable = (state?: State) => {
    makeTableData(this.props.table).then(table => this.setState({...state, table}));
  }

  wrapCell = (cell: WrapCell) => {
    const lst = this.props.table.getList();
    const item = lst.get(cell.row);
    const edit = this.state.editItem || {ref: null, col: -1};
  
    if (edit.ref && edit.ref == item && edit.col == cell.colIdx) {
      return (
        <TextBox
          style={{boxSizing: 'border-box', width: '100%', height: '100%'}}
          defaultValue={getValue(edit.ref, edit.col)}
          onEnter={(value: string) => {
            setValue(edit.ref, edit.col, value);
            this.updateTable({editItem: null});
          }}
          onCancel={() => {
            this.setState({editItem: null});
          }}
        />
      );
    }

    return (
      <div
        onDoubleClick={() => this.onEditItem(item, cell.colIdx)}
        onContextMenu={(evt: React.MouseEvent<HTMLDivElement>) => this.onContextMenu(item, cell.row, evt)}
        style={{height: '100%'}}
      >
        {cell.element}
      </div>
    );
  }

  onSchemeChanged = (scheme: Scheme.Scheme) => {
    this.props.table.setLayout(JSON.stringify(scheme));
  };

  render() {
    return (
      <Layout scheme={this.state.scheme} onChanged={this.onSchemeChanged}>
        {this.renderTable()}
        {this.renderAppend()}
      </Layout>
    );
  }
}