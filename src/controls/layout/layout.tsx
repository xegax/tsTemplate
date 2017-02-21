import * as React from 'react';
import {cloneDeep} from 'lodash';
import {startDragging} from 'common/start-dragging';
import {findParentNode} from 'common/dom';
import {Point} from 'common/point';
import {className} from 'common/common';
import {Timer} from 'common/timer';
import * as Scheme from './scheme';

interface Props extends React.HTMLProps<any> {
  scheme: Scheme.Scheme;
}

interface State {
  scheme?: Scheme.Scheme;
  hover?: string;
  tgt?: Scheme.Children | Scheme.Item;
  hoverElement?: HTMLElement;
  side?: string;
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

export class Layout extends React.Component<Props, State> {
  private itemsMap: {[uid: string]: Scheme.Children | Scheme.Item} = {};

  constructor(props: Props) {
    super(props);
    this.state = {
      scheme: cloneDeep(props.scheme)
    };

    this.updateUUIDs();
  }

  private checkSize = () => {
    const root = this.refs['root'] as HTMLElement;

    if (this.updateSizes())
      this.forceUpdate();
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

  private updateUUIDs() {
    this.itemsMap = {};

    var uid = 0;
    const updateUID = (item: Scheme.Children | Scheme.Item, parent: Scheme.Children) => {
      item.uid = 'u-' + (uid++);
      item['parent'] = parent;
      this.itemsMap[item.uid] = item;
      if (item.type != 'item')
        (item as Scheme.Children).children.forEach(child => updateUID(child, item));
    }

    updateUID(this.state.scheme, null);
  }

  /*componentWillReceiveProps(props: Props) {
    this.setState({scheme: cloneDeep(props.scheme)}, () => {
      this.updateUUIDs();
      this.updateSizes();
    });
  }*/

  private findContainer(el: HTMLElement) {
    while (el && el.getAttribute('data-uid') == null ) {
      el = el.parentElement;
    }

    return el;
  }

  private startMove(event, tgt) {
    var root = this.refs['root'] as HTMLElement;
    var curr: HTMLElement;
    var prev: HTMLElement;
    startDragging({
      x: 0, y: 0
    }, {
      onDragging: (event) => {
        const side = this.getSide({x: event.event.pageX, y: event.event.pageY}, this.state.hoverElement);
        
        if (side != this.state.side)
          this.setState({side});

        if (prev == event.event.toElement)
          return;

        prev = event.event.toElement as HTMLElement;
        if (this.refs['cursor'] && prev == this.refs['cursor'])
          return;

        if (!findParentNode(prev, root))
          return;

        var el = this.findContainer(prev as HTMLElement);
        if (el == curr)
          return;
        curr = el;
        if (curr) {
          const uuid = curr.getAttribute('data-uid');
          el = this.itemsMap[uuid]['element'];
          this.setState({tgt, hover: uuid, hoverElement: el, side: this.getSide({x: event.event.pageX, y: event.event.pageY}, el)});
        } else {
          this.setState({hover: null, hoverElement: null, side: null});
        }
      },
      onDragEnd: () => {
        this.dropTo();
        this.setState({tgt: null, hover: null, hoverElement: null, side: null});
      }
    })(event);
  }

  private dropTo() {
    if (this.state.hover == null)
      return;

    const {tgt, side} = this.state;
    const hover = this.itemsMap[this.state.hover];
    const tgtParent = tgt['parent'] as Scheme.Children;
    const hoverParent = hover['parent'] as Scheme.Children;

    if (hover == tgt)
      return;

    if (tgtParent)
        tgtParent.children.splice(tgtParent.children.indexOf(tgt), 1);

    if (hover.type == 'item') {
      if (hoverParent && hoverParent.type == 'row') {
        if (side == 'right') {
          const idx = hoverParent.children.indexOf(hover);
          hoverParent.children.splice(idx, 1, hover, tgt);
        } else if (side == 'left') {
          const idx = hoverParent.children.indexOf(hover);
          hoverParent.children.splice(idx, 1, tgt, hover);
        } else if (side == 'top' || side == 'bottom') {
          const newItem = side == 'top' ? Scheme.column(tgt, hover).get() : Scheme.column(hover, tgt).get();
          hoverParent.children.splice(hoverParent.children.indexOf(hover), 1, newItem);
        }
      } else if (hoverParent && hoverParent.type == 'column') {
        if (side == 'bottom') {
          const idx = hoverParent.children.indexOf(hover);
          hoverParent.children.splice(idx, 1, hover, tgt);
        } else if (side == 'top') {
          const idx = hoverParent.children.indexOf(hover);
          hoverParent.children.splice(idx, 1, tgt, hover);
        } else if (side == 'left' || side == 'right') {
          const newItem = side == 'left' ? Scheme.row(tgt, hover).get() : Scheme.row(hover, tgt).get();
          hoverParent.children.splice(hoverParent.children.indexOf(hover), 1, newItem);
        }
      } else if (hoverParent && hoverParent.type == 'row') {
        if (side == 'top' || side == 'bottom') {
          const newItem = side == 'top' ? Scheme.column(tgt, hover).get() : Scheme.column(hover, tgt).get();
          hoverParent.children.splice(hoverParent.children.indexOf(hover), 1, newItem);
        }
      }
    }
    this.updateUUIDs();
  }

  private renderTitle(parent: Scheme.Children | Scheme.Item) {
    return (
      <div
        data-uid={parent.uid}
        className={classes.title}
        onMouseDown={e => this.startMove(e, parent)}
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
  
  private updateSizes() {
    let counter = 0;
    const updateSizes = (item?: Scheme.Children | Scheme.Item) => {
      const children = (item as Scheme.Children).children;
      if (children) {
        children.forEach(child => updateSizes(child));
      } else {
        const el = item['element'] as HTMLElement;
        const rect = el.getBoundingClientRect();
        
        if (item['width'] != rect.width) {
          item['width'] = rect.width;
          counter++;
        }
        
        if (item['height'] != rect.height) {
          item['height'] = rect.height;
          counter++;
        }
      }
    };

    updateSizes(this.state.scheme);
    return counter > 0;
  }

  private createWrap() {
    var idMap: {[id: string]: React.ReactChild} = {};
    React.Children.forEach(this.props.children, (child: React.ReactElement<any>, idx) => {
      idMap[child.key] = child;
    });

    let cnt = 0;
    const createWrap = (parent: Scheme.Children | Scheme.Item, clearWidth: boolean, clearHeight: boolean) => {
      if (parent.show == false)
        return;

      if (parent.type == 'item') {
        const item = (
          <div
            ref={e => parent['element'] = e}
            data-uid={parent.uid}
            className={classes.item}
            key={'holder-' + (cnt++)}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: parent.grow != null ? parent.grow : undefined
            }}>
              {React.cloneElement(idMap[parent.id] as React.DOMElement<any>, {
                  width: parent['width'],
                  height: parent['height']
                })}
          </div>
        );
        if (parent.title) {
          return (
            <div
              className={classes.column}
              key={'column-' + (cnt++)}
              style={{flexGrow: parent.grow != null ? parent.grow : undefined}}>
                {parent.title ? this.renderTitle(parent) : null}
                {item}
            </div>
          );
        } else {
          return item;
        }
      } else if (parent.type == 'column') {
        return (
          <div
            ref={e => parent['element'] = e}
            data-uid={parent.uid}
            className={classes.column}
            key={'column-' + (cnt++)}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: parent.grow != null ? parent.grow : undefined
            }}>
                {parent.title ? this.renderTitle(parent) : null}
                {parent.children.map((item, i) => {
                  const wrap = createWrap(item, false, item.grow != 0);
                  if (i == 0)
                    return wrap;
                  const first = parent.children[i - 1] as Scheme.Item;
                  const second = parent.children[i] as Scheme.Item;
                  if (first.grow == 0 || second.grow == 0)
                    return wrap;

                  return [
                    this.renderColumnSplit('split-'+ (cnt++), first, second),
                    wrap
                  ];
                })}
          </div>
        );
      } else if (parent.type == 'row') {
        return (
          <div
            ref={e => parent['element'] = e}
            data-uid={parent.uid}
            className={classes.row}
            key={'row-' + (cnt++)}
            style={{
              width: clearWidth ? 0 : undefined,
              height: clearHeight ? 0 : undefined,
              flexGrow: parent.grow != null ? parent.grow : undefined
            }}>
                {parent.children.map((item, i) => {
                  const wrap = createWrap(item, item.grow != 0, false);
                  if (i == 0)
                    return wrap;
                  
                  const first = parent.children[i - 1] as Scheme.Item;
                  const second = parent.children[i] as Scheme.Item;
                  if (first.grow == 0 || second.grow == 0)
                    return wrap;

                  return [
                      this.renderRowSplit('split-'+ (cnt++), first, second),
                      wrap
                    ];
                })}
          </div>
        );
      }
    }

    return createWrap(this.state.scheme, false, false);
  }

  private renderColumnSplit(key: string, left: Scheme.Item, right: Scheme.Item) {
    return (<div key={key} className={classes.columnSplit} onMouseDown={e => this.resizeColumnItems(e, left, right)}/>);
  }

  private renderRowSplit(key: string, left: Scheme.Item, right: Scheme.Item) {
    return (<div key={key} className={classes.rowSplit} onMouseDown={e => this.resizeItems(e, left, right)}/>);
  }

  private resizeItems(event, left: Scheme.Item, right: Scheme.Item) {
    const parent = left['parent'] as Scheme.Children;
    const sizes = parent.children.map(item => {
      return [(item['element'] as HTMLElement).clientWidth, item.grow];
    });

    const idx = parent.children.indexOf(left);
    const leftSize = sizes[idx][0];
    const rightSize = sizes[idx + 1][0];
    startDragging({x: 0, y: 0}, {
      onDragging: (e) => {
        sizes[idx][0] = leftSize + e.x;
        sizes[idx + 1][0] = rightSize - e.x;
        updateGrows(sizes);
        parent.children.forEach((item, i) => item.grow = sizes[i][1]);
        this.updateSizes();
        this.forceUpdate();
      }
    })(event);
  }

  private resizeColumnItems(event, left: Scheme.Item, right: Scheme.Item) {
    const parent = left['parent'] as Scheme.Children;
    const sizes = parent.children.map(item => {
      return [(item['element'] as HTMLElement).clientHeight, item.grow];
    });

    const idx = parent.children.indexOf(left);
    const leftSize = sizes[idx][0];
    const rightSize = sizes[idx + 1][0];
    startDragging({x: 0, y: 0}, {
      onDragging: (e) => {
        sizes[idx][0] = leftSize + e.y;
        sizes[idx + 1][0] = rightSize - e.y;
        updateGrows(sizes);
        parent.children.forEach((item, i) => item.grow = sizes[i][1]);
        this.updateSizes();
        this.forceUpdate();
      }
    })(event);
  }

  private getSide(point: Point, hoverElement: HTMLElement) {
    if (!hoverElement)
      return '';
    const bbox = hoverElement.getBoundingClientRect();
    const x = Math.max(0, point.x - bbox.left) / bbox.width;
    const y = Math.max(0, point.y - bbox.top) / bbox.height;
    const bbox2 = (this.refs['root'] as HTMLElement).getBoundingClientRect();
    const rect = {
      left: bbox.left - bbox2.left,
      top: bbox.top - bbox2.top,
      width: bbox.width,
      height: bbox.height
    };

    const block = 1/3;
    if (x <= block && y >= block && y <= 1 - block) {
      return 'left';
    } else if (x >= 1 - block && y >= block && y <= 1 - block) {
      return 'right';
    } else if (y < 0.5) {
      return 'top';
    }
    
    return 'bottom';
  }

  private renderCursor() {
    const {hoverElement, side} = this.state;
    
    if (!hoverElement)
      return;

    const bbox = hoverElement.getBoundingClientRect();
    const bbox2 = (this.refs['root'] as HTMLElement).getBoundingClientRect();
    const rect = {
      left: bbox.left - bbox2.left,
      top: bbox.top - bbox2.top,
      width: bbox.width,
      height: bbox.height
    };

    if (side == 'left') {
      rect.width = rect.width / 2;
    } else if (side == 'right') {
      rect.width = rect.width / 2;
      rect.left += rect.width;
    } else if (side == 'top') {
      rect.height = rect.height / 2;
    } else if (side == 'bottom') {
      rect.height = rect.height / 2;
      rect.top += rect.height;
    }
    return <div ref='cursor' className={classes.cursor} style={rect}/>; 
  }

  render() {
    return (
      <div ref='root' className={classes.layout}>
        {this.createWrap()}
        {this.renderCursor()}
      </div>
    );
  }
}

