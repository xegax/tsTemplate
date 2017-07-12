import * as React from 'react';

type CtrlViewComp = React.Component<{init: (cltr: React.Component<any, any>) => any} & React.HTMLProps<any>, {view: JSX.Element}>;

interface Props {
  onInit: (ctrl: ViewRef) => JSX.Element;
}

interface State {
  view?: JSX.Element;
}

export interface ViewRef {
  setView(el: JSX.Element);
}

export class OptionalView extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {view: this.props.onInit({
      setView: view => {
        this.setState({view});
      }
    }) || null};
  }

  render() {
    return this.state.view;
  }
}
