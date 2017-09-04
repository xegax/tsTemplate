import * as React from 'react';
import {Table, TableData, WrapCell} from 'controls/table/simple-table';
import {VirtualTableData, TableCell} from 'table/virtual-table-data';
import {TextBox} from 'controls/textbox';

export interface TreeItem {
  label: string;
  open?: boolean;
  items?: Array<TreeItem>;
  getItems?: (parent: TreeItem) => Promise<Array<TreeItem>>;
  getItemsPromise?: Promise<Array<TreeItem>>;
  level?: number;
}

function updateLevels(level: number, items: Array<TreeItem>) {
  let rows = 0;
  items.forEach(item => {
    rows++;
    item.level = level;
    if (item.open && item.items)
      rows += updateLevels(level + 1, item.items);
  });

  return rows;
}

function findTreeItemByRow(absRow: number, items: Array<TreeItem>): TreeItem {
  let row = 0;
  const findItem = (items: Array<TreeItem>) => {
    for (let n = 0; n < items.length; n++) {
      const item = items[n];
      if (absRow == row)
        return item;
      row++;

      if (item.open && item.items) {
        const res = findItem(item.items);
        if (res != null)
          return res;
      }
    }
    return null;
  };

  return findItem(items);
}

function isFolder(item: TreeItem): boolean {
  return item.items != null || item.getItems != null;
}

interface Icons {
  folderOpen: string;
  folder: string;
}

interface Props {
  width?: number;
  height?: number;
  items: Array<TreeItem>;
  icons?: Icons;
}

interface State {
  table?: TableData;
  rowCount?: number;
  editItem?: TreeItem;
}

export class Tree extends React.Component<Props, State> {
  static defaultProps = {
    icons: {
      folderOpen: 'fa fa-folder-open',
      folder: 'fa fa-folder'
    } as Icons
  };

  constructor(props: Props) {
    super(props);

    this.state = {
      table: new VirtualTableData(props.items.length, 1, this.getTreeItem),
      rowCount: props.items.length
    };

    updateLevels(0, this.props.items);
  }

  private getTreeItem = (row: number): TableCell => {
    const item = findTreeItemByRow(row, this.props.items);
    return {text: item.label, raw: item};
  }

  private toggleItem(item: TreeItem) {
    if (!isFolder(item))
      return;

    item.open = !(item.open || false);
    if (!item.items) {
      const timerId = setTimeout(() => {
        item.getItemsPromise = task;
        this.setState({});
      }, 200);

      const task = item.getItems(item).then((arr: Array<TreeItem>) => {
        clearTimeout(timerId);
        item.getItemsPromise = null;
        item.items = arr;
        this.updateTable();
        return arr;
      });
      this.setState({});
    } else {
      this.updateTable();
    }
  }

  private updateTable(levels = true, state: State = {}) {
    let rowCount = this.state.rowCount;
    if (levels)
      rowCount = updateLevels(0, this.props.items);

    const params = {
      rows: rowCount,
      cols: 1,
      maxCache: 1000,
      getCell: this.getTreeItem
    };

    VirtualTableData.create(params).then(table => {
      this.setState({ table, rowCount, ...state });
    });
  }

  private getIcon(item: TreeItem) {
    if (item.getItemsPromise)
      return 'fa fa-spinner fa-pulse';
    if (!item.open)
      return this.props.icons.folder || Tree.defaultProps.icons.folder;
    return this.props.icons.folderOpen || Tree.defaultProps.icons.folderOpen;
  }

  private onDoubleClick(item: TreeItem) {
    this.setState({editItem: item});
  }

  private renderRow(item: TreeItem, params: WrapCell) {
    if (item != this.state.editItem)
      return params.element;

    return (
      <TextBox
        style={{font: 'inherit', height: '100%'}}
        onEnter={(value) => {
          item.label = value;
          this.updateTable(false, {editItem: null});
        }}
        onCancel={() => this.setState({editItem: null})}
        enterOnBlur
        defaultFocus
        defaultValue={item.label}
      />
    );
  }

  private wrapCell = (params: WrapCell) => {
    const item = findTreeItemByRow(params.row, this.props.items);
    return (
      <div style={{marginLeft: item.level * 8, display: 'flex', height: '100%'}} onDoubleClick={() => this.onDoubleClick(item)}>
        {isFolder(item) ? <i className={this.getIcon(item)} style={{minWidth: 18, padding: 4, cursor: 'pointer'}} onClick={() => this.toggleItem(item)}/> : null}
        {this.renderRow(item, params)}
      </div>
    );
  }

  render() {
    return (
      <Table
        className='tree'
        wrapCell={this.wrapCell}
        width={this.props.width}
        height={this.props.height}
        tableData={this.state.table}
        header={false}
      />
    );
  }
}
