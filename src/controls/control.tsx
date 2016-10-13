import * as React from 'react';

interface Props {
  text?: string;
}

export class Control extends React.Component<Props, {}> {
  static defaultProps = {
    text: 'Control'
  };

  render() {
    return <div className='background'>{this.props.text}</div>;
  }
}
