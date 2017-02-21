import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {Layout} from 'controls/layout/layout';
import {getContainer} from 'examples-main/helpers';
import * as Scheme from 'controls/layout/scheme';

interface Props {
  color?: string;
  label?: string;
  width?: number;
  height?: number;
}

class Dummy extends React.Component<Props, {s?: string}> {
  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const {width, height} = this.props;
    let size = '' + (this.state.s || '');
    if (width != null)
      size += 'width: '+ width;
    if (height != null)
      size += ' height: ' + height;
    return (
      <div
        onClick={e => this.setState({s: 'clicked!'})}
        style={{
          boxSizing: 'border-box',
          border: '3px solid gold',
          width: this.props.width,
          height: this.props.height,
          backgroundColor: this.props.color
        }}>{this.props.label + ', ' + size}</div>
    );
  }
}

class LayoutTest extends React.Component<{}, {scheme: Scheme.Scheme}> {
  constructor(props) {
    super(props);

    this.state = {
      scheme: this.getScheme()
    };
  }

  getScheme(): Scheme.Scheme {
    return Scheme.row(
      Scheme.column(
        Scheme.item('test', 0),
        Scheme.row(Scheme.item('row2'), Scheme.item('row1')),
        Scheme.item('table'),
        Scheme.row(Scheme.item('row1', 0), Scheme.item('row2'), Scheme.item('row1', 0)),
        Scheme.item('table'),
        Scheme.row(Scheme.item('row1'), Scheme.item('row2')).grow(0)
      ),
      Scheme.column(Scheme.item('details')).grow(0.2),
    ).get();
  }

  render() {
    return (
      <Layout scheme={this.state.scheme}>
        <Dummy key='table' color='pink' label='table'/>
        <Dummy key='details' color='lightgreen' label='details'/>
        <Dummy key='test' color='lightblue' label='test x y z 1 2 3 4 5'/>
        <Dummy key='row1' color='silver' label='row -'/>
        <Dummy key='row2' color='gray' label='row xxxxxxxxxx'/>
      </Layout>
    );
  }
}

ReactDOM.render(<LayoutTest/>, getContainer());