import * as React from 'react';
import {PrDocModel} from '../model/prdoc-model';
import {Layout} from 'controls/layout/layout';
import * as Scheme from 'controls/layout/scheme';
import {FitToParent} from 'common/fittoparent';
import {PrDocScene} from '../model/document';
import {className} from 'common/common';
import {PrDocFrameView} from './prdoc-frame-view';

interface Props {
  model: PrDocModel;
}

interface State {
  scheme?: {root: Scheme.Scheme};
  frameIdx?: number;
}

const classes = {
  view: 'prdoc-view',
  frameItem: 'prdoc-view--frameitem',
  selectedFrame: 'prdoc-view--selected-frame',
  list: 'prdoc-view--list'
};

export class PrDocView extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      scheme: {root: Scheme.row(Scheme.item('frames', 0.3), Scheme.item('canvas', 1)).get()},
      frameIdx: 0
    };

    if (this.props.model.getDoc().getFrames().getLength() == 0)
      this.props.model.appendFrame().then(this.updateView);
  }

  private updateView = () => this.setState({});

  private onSelectFrame(frameIdx: number) {
    if (this.state.frameIdx == frameIdx)
      return;

    this.setState({frameIdx});
  }

  private renderFrames() {
    let list = this.props.model.getDoc().getFrames();
    let arr = list.getSelectedItems();

    return (
      <div key='frames' className={classes.list}>
        <div
          style={{cursor: 'pointer'}}
          onClick={() => this.props.model.appendFrame().then(this.updateView)}
        >
          +frame
        </div>
        {arr.map((frame: PrDocScene, idx) => {
          return (
            <div
              key={idx}
              className={className(classes.frameItem, idx == this.state.frameIdx && classes.selectedFrame)}
              onClick={() => this.onSelectFrame(idx)}
            >
              {`frame ${frame.getId()}`}
            </div>
          );
        })}
      </div>
    );
  }

  private renderCanvas() {
    const doc = this.props.model.getDoc();
    return (
      <PrDocFrameView
        key='canvas'
        frame={doc.getFrames().get(this.state.frameIdx)}
        canvasSize={doc.getSize()}
        makeObj={(x, y, parent) => this.props.model.appendObj(x, y, doc.getFrames().get(this.state.frameIdx), parent)}
      />
    );
  }

  render() {
    return (
      <div className={classes.view}>
        <Layout scheme={this.state.scheme}>
          {this.renderFrames()}
          {this.renderCanvas()}
        </Layout>
      </div>
    );
  }
}