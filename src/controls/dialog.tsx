import * as React from 'react';
import {className} from 'common/common';
import {ComponentContainer} from 'controls/component-container';

const classes = {
  dialog: 'dialog',
  border: 'dialog__border',
  title: 'dialog__head',
  title_shell: 'dialog__head__shell',
  body: 'dialog__body',
  overlay: 'overlay'
};

interface Props {
  title?: string | React.ReactChildren;
  autoClose?: boolean;
  children?: React.ReactChildren;
  onClosed?: () => void;
}

interface State {
}

const globalContainer = new ComponentContainer(document.body);

export class Dialog extends React.Component<Props, State> {
  static defaultProps: Props = {
    autoClose: true
  };

  protected renderTitle() {
    if (this.props.title == null)
      return null;

    return (
      <div className={classes.title}>
        <div className={classes.title_shell}>
          {this.props.title}
        </div>
      </div>
    );
  }

  protected renderBody() {
    return (
      <div className={classes.body}>
        {this.props.children}
      </div>
    );
  }

  protected onClickByOverlay = (e) => {
    this.props.onClosed && this.props.onClosed();
  };

  protected onClickByBody = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  render() {
    return (
      <div className={classes.overlay} onClick={this.onClickByOverlay}>
        <div className={className(classes.dialog, classes.border)} onClick={this.onClickByBody}>
          {this.renderTitle()}
          {this.renderBody()}
        </div>
      </div>
    );
  }

  static showModal(content: React.ReactElement<any>, props?: Props, cont?: ComponentContainer) {
    if (cont == null)
      cont = globalContainer;
    let id;
    const onClosed = () => {
      cont.remove(id);
      props && props.onClosed && props.onClosed();
    };
    id = cont.push(<Dialog {...props} onClosed={onClosed}>{content}</Dialog>);
    return {
      close: () => {
        cont.remove(id);
      }
    };
  }
}