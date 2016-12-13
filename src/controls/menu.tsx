import * as React from 'react';
import {PopupContext} from 'controls/popup';
import {className} from 'common/common';

let popupCtx = new PopupContext();

const classes = {
  menu: 'custom_menu',
  iconable: 'custom_menu--iconable',
  menuItem: 'custom_menu--item',
  icon: 'custom_menu--icon',
  separator: 'custom_menu--separator',
  submenuIcon: 'custom_menu--submenu_icon fa fa-angle-double-right'
};

const MENU_SIZE = 150;

export const Separator: MenuItem = {label: '_', command: () => {}};

export interface MenuItem {
  label: string;
  icon?: string;
  highlight?: boolean;
  submenu?: Array<MenuItem>;
  command?: () => void;
}

interface Props {
  items: Array<MenuItem>;
  autoClose?: boolean;
}

interface State {
  items?: Array<MenuItem>;
}

export class Menu extends React.Component<Props, State> {
  static defaultProps = {
    autoClose: true
  };

  constructor(props) {
    super(props);
    this.state = {items: Array<MenuItem>()};
  }

  static showUnder(element: HTMLElement, menu: JSX.Element) {
    let bbox = element.getBoundingClientRect();
    let pos = {
      x: bbox.left,
      y: bbox.top + bbox.height
    };
    let wndRect = document.body.getBoundingClientRect();
    if (pos.x + MENU_SIZE > wndRect.right)
      pos.x = wndRect.right - MENU_SIZE;
    popupCtx.show(pos, menu);
  }

  private onClick = (item: MenuItem) => {
    if (item == Separator)
      return;
    try {
      item.command && item.command();
    }
    catch(e) {
      console.log(e);
    }
    if (this.props.autoClose)
      popupCtx.close();
  }

  private onEnterItem = (item: MenuItem) => {
    if (item.submenu == null)
      return;

    if (this.state.items.indexOf(item) != -1)
      return;

    this.state.items.push(item);
    this.setState({items: this.state.items});
  };

  private onLeaveItem = (item: MenuItem) => {
    let i = this.state.items.indexOf(item);
    if (i == -1)
      return;
    this.state.items.splice(i, 1);
    this.setState({items: this.state.items});
  };

  private renderSubmenu(item: MenuItem) {
    if (!item.submenu || this.state.items.indexOf(item) == -1)
      return;

    let style = {
      position: 'absolute'
    };

    let wndRect = document.body.getBoundingClientRect();

    const onMount = (e: HTMLDivElement) => {
      if (!e)
        return;

      let rect = e.getBoundingClientRect();
      let diff = wndRect.right - rect.right;
      if (diff < 0 ) {
        e.style.left = diff + 'px';
      }
    };
    return <div ref = {onMount} style={style}>{this.renderItems(item.submenu)}</div>;
  }

  private renderItems(items: Array<MenuItem>) {
    let hasIcons = this.hasIcons(items);
    let menuItems = items.map((item, i) => {
      if (item == Separator)
        return <li key={i} className={classes.separator}/>;

      let icon = undefined;
      if (item.icon)
        icon = <i className={className(classes.icon, item.icon)}/>;

      let style = undefined;
      if (hasIcons)
        style = {paddingLeft: 28};
      return (
          <li
            style={style}
            onMouseEnter={e => this.onEnterItem(item)}
            onMouseLeave={e => this.onLeaveItem(item)}
            onClick={e => this.onClick(item)}
            key={i}
            className={classes.menuItem}>
              <i className={className(classes.icon, item.icon)}/>
                {item.label}
                {item.submenu ? <i className={classes.submenuIcon}/> : undefined}
                {this.renderSubmenu(item)}
          </li>
        );
    });

    return (
      <ul
        className={className(classes.menu, this.hasIcons(this.props.items) && classes.iconable)}>
        {menuItems}
      </ul>
    );
  }

  private hasIcons(items: Array<MenuItem>) {
    for (let n = 0; n < items.length; n++) {
      if (items[n].icon != null)
        return true;
    }
    return false;
  }

  render() {
    return this.renderItems(this.props.items);
  }
}