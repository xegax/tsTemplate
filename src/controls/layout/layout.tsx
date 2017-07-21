import * as React from 'react';
import {cloneDeep} from 'lodash';
import {startDragging} from 'common/start-dragging';
import {findParentNode} from 'common/dom';
import {Point} from 'common/point';
import {className} from 'common/common';
import {Timer} from 'common/timer';
import * as Scheme from './scheme';

interface Holder {
  obj: Scheme.Children | Scheme.Item;
  parent: Holder;
  element: HTMLElement;
  width: number;
  height: number;
}

interface Props extends React.HTMLProps<any> {
  scheme: {root: Scheme.Scheme};
  onChanged?: (scheme: Scheme.Scheme) => void;
}

interface State {
  holderMap?: {[id: string]: Holder};
  scheme?: Scheme.Scheme;
  width?: number;
  height?: number;
}

const classes = {
  layout: 'layout',
  item: 'layout-item',
  growableItem: 'layout-growable-item',
  growableWrapper: 'layout-growable-wrapper',
  wrapper: 'layout-wrapper',
  column: 'layout-column',
  row: 'layout-row',
  holder: 'layout-block-holder',
  growableHolder: 'layout-block-holder-growable',
  title: 'layout-title',
  closeIcon: 'fa fa-times',
  cursor: 'layout-cursor',
  rowSplit: 'layout-row-split',
  columnSplit: 'layout-column-split'
};

function updateGrows(sizeArr: Array<Array<number>>) {
  var sizeSumm = 0;
  sizeArr.forEach(item => {
    if (item[1] != 0)
      sizeSumm += item[0];
  });

  sizeArr.forEach(item => {
    if (item[1] != 0)
      item[1] = item[0] / sizeSumm;
  });
}

const globTimer = new Timer();

const Error = {
  ITEM_UID_NOT_UNIQUE: 'Item uid not unique'
};

export class Layout extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      holderMap: {},
      scheme: cloneDeep(props.scheme.root)
    };

    this.updateHolderMap(this.state.holderMap, this.state.scheme);
  }

  private updateHolderMap(holderMap: {[id: string]: Holder}, scheme: Scheme.Scheme) {
    let ids: {[id: string]: number} = {};

    let uidNum = 0;
    const update = (item: Scheme.Children | Scheme.Item, parent: Scheme.Children) => {
      if (item.uid == null)
        item.uid = 'uid-' + (uidNum++);
      if (ids[item.uid] != null)
        throw Error.ITEM_UID_NOT_UNIQUE;

      ids[item.uid] = 1;
      let holder: Holder = holderMap[item.uid] || (holderMap[item.uid] = {} as any);
      holder.obj = item;
      
      if (parent)
        holder.parent = holderMap[parent.uid];
      
      if (item.type != 'item') {
        (item as Scheme.Children).children.forEach(child => {
          update(child, item);
        });
      }
    }

    update(scheme, null);
  }

  private checkSize = () => {
    const root = this.refs['root'] as HTMLElement;

    this.updateSizes(false);
  };

  componentDidMount() {
    globTimer.addUniqueCallback(this.checkSize);
    if (!globTimer.isRunning())
      globTimer.runRepeat(500);
    this.checkSize();
  }

  componentWillUnmount() {
    globTimer.removeCallback(this.checkSize);
    if (globTimer.isRunning() && !globTimer.getCallbacksCount())
      globTimer.stop();
  }

  componentWillReceiveProps(props: Props) {
    if (props.scheme == this.props.scheme)
      return;
    
    const scheme = cloneDeep(props.scheme.root);
    this.updateHolderMap(this.state.holderMap, scheme);

    this.setState({scheme}, () => {
      this.updateSizes(true);
    });
  }

  private renderTitle(parent: Scheme.Children | Scheme.Item) {
    return (
      <div
        data-uid={parent.uid}
        className={classes.title}
      >
        title
        <i
          className={classes.closeIcon}
          onClick={e => {
            parent.show = false;
            this.forceUpdate();
          }}/>
      </div>
    );
  }
  
  private updateSizes(forceUpdate: boolean) {
    let counter = 0;
    const {holderMap} = this.state;
    const updateSizes = (item?: Scheme.Children | Scheme.Item) => {
      const children = (item as Scheme.Children).children;
      if (children) {
        children.forEach(child => updateSizes(child));
      } else {
        const holder = holderMap[item.uid];
        if (holder.element == null)
          return;

        const rect = holder.element.getBoundingClientRect();
        
        if (holder.width != rect.width) {
          holder.width = rect.width;
          counter++;
        }
        
        if (holder.height != rect.height) {
          holder.height = rect.height;
          counter++;
        }
      }
    };

    updateSizes(this.state.scheme);
    if (forceUpdate || counter > 0)
      this.forceUpdate();
  }

  private createWrap() {
    var childMap: {[id: string]: React.ReactChild} = {};
    React.Children.forEach(this.props.children, (child: React.ReactElement<any>) => {
      childMap[child.key] = child;
    });

    const createWrap = (item: Scheme.Children | Scheme.Item, clearWidth: boolean, clearHeight: boolean, unshowGrow: number = 0) => {
      if (item.show == false)
        return;
      
      const holder = this.state.holderMap[item.uid];

      if (item.type == 'item') {
        const itemElement = (
          <div
            ref={e => holder.element = e}
            data-uid={item.uid}
            className={classes.item}
            key={'item-' + item.uid}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: item.grow != null ? item.grow + unshowGrow : undefined
            }}>
              {React.cloneElement(childMap[item.uid] as React.DOMElement<any, any>, {
                  width: holder.width,
                  height: holder.height
                })}
          </div>
        );
        if (item.title) {
          return (
            <div
              className={classes.column}
              key={'title-' + item.uid}
              style={{flexGrow: item.grow != null ? item.grow : undefined}}>
                {item.title ? this.renderTitle(item) : null}
                {itemElement}
            </div>
          );
        } else {
          return itemElement;
        }
      } else if (item.type == 'column') {
        const col: Scheme.Children = item;
        const colChildren = col.children.filter(item => item.show != false) as Array<Scheme.Item>;
        
        let unshowGrow = 0;
        col.children.forEach(child => {
          if (child.show == false)
            unshowGrow += child.grow;
        });

        return (
          <div
            ref={e => holder.element = e}
            data-uid={col.uid}
            className={classes.column}
            key={'column-' + col.uid}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: col.grow != null ? col.grow : undefined
            }}>
                {col.title ? this.renderTitle(col) : null}
                {colChildren.map((item, i) => {
                  const wrap = createWrap(item, false, item.grow != 0, item.grow != 0 ? unshowGrow : 0);
                  if (i == 0)
                    return wrap;
                  const first = colChildren[i - 1] as Scheme.Item;
                  const second = colChildren[i] as Scheme.Item;
                  if (first.grow == 0 || second.grow == 0)
                    return wrap;

                  return [
                    this.renderColumnSplit('split-'+ first.uid, colChildren, first, second),
                    wrap
                  ];
                })}
          </div>
        );
      } else if (item.type == 'row') {
        const row: Scheme.Children = item;
        const rowChildren = row.children.filter(item => item.show != false) as Array<Scheme.Item>;

        let unshowGrow = 0;
        row.children.forEach(child => {
          if (child.show == false)
            unshowGrow += child.grow;
        });
        return (
          <div
            ref={e => holder.element = e}
            data-uid={row.uid}
            className={classes.row}
            key={'row-' + row.uid}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: row.grow != null ? row.grow : undefined
            }}>
                {rowChildren.map((item, i) => {
                  const wrap = createWrap(item, item.grow != 0, false, item.grow != 0 ? unshowGrow : 0);
                  if (i == 0)
                    return wrap;
                  
                  const first = rowChildren[i - 1] as Scheme.Item;
                  const second = rowChildren[i] as Scheme.Item;
                  if (first.grow == 0 || second.grow == 0)
                    return wrap;

                  return [
                      this.renderRowSplit('split-'+ first.uid, rowChildren, first, second),
                      wrap
                    ];
                })}
          </div>
        );
      }
    }

    return createWrap(this.state.scheme, false, false);
  }

  private renderColumnSplit(key: string, children: Array<Scheme.Item>, left: Scheme.Item, right: Scheme.Item) {
    return (<div key={key} className={classes.columnSplit} onMouseDown={e => this.resizeColumnItems(e, children, left, right)}/>);
  }

  private renderRowSplit(key: string, children: Array<Scheme.Item>, left: Scheme.Item, right: Scheme.Item) {
    return (<div key={key} className={classes.rowSplit} onMouseDown={e => this.resizeItems(e, children, left, right)}/>);
  }

  private resizeItems(event, children: Array<Scheme.Item>, left: Scheme.Item, right: Scheme.Item) {
    const sizes = children.map(item => {
      return [(this.state.holderMap[item.uid].element as HTMLElement).clientWidth, item.grow];
    });

    const idx = children.indexOf(left);
    const leftSize = sizes[idx][0];
    const rightSize = sizes[idx + 1][0];
    startDragging({x: 0, y: 0}, {
      onDragging: (e) => {
        sizes[idx][0] = leftSize + e.x;
        sizes[idx + 1][0] = rightSize - e.x;
        updateGrows(sizes);
        children.forEach((item, i) => item.grow = sizes[i][1]);
        this.updateSizes(true);
      },
      onDragEnd: () => {
        this.props.onChanged && this.props.onChanged(cloneDeep(this.state.scheme));
      }
    })(event);
  }

  private resizeColumnItems(event, children: Array<Scheme.Item>, left: Scheme.Item, right: Scheme.Item) {
    const sizes = children.map(item => {
      return [(this.state.holderMap[item.uid].element as HTMLElement).clientHeight, item.grow];
    });

    const idx = children.indexOf(left);
    const leftSize = sizes[idx][0];
    const rightSize = sizes[idx + 1][0];
    startDragging({x: 0, y: 0}, {
      onDragging: (e) => {
        sizes[idx][0] = leftSize + e.y;
        sizes[idx + 1][0] = rightSize - e.y;
        updateGrows(sizes);
        children.forEach((item, i) => item.grow = sizes[i][1]);
        this.updateSizes(true);
      },
      onDragEnd: () => {
        this.props.onChanged && this.props.onChanged(cloneDeep(this.state.scheme));
      }
    })(event);
  }

  render() {
    return (
      <div ref='root' className={classes.layout}>
        {this.createWrap()}
      </div>
    );
  }
}

