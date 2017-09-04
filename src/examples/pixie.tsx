import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';

class PIXIView extends React.Component<{app: PIXI.Application}, {sprite: PIXI.extras.AnimatedSprite}> {
  private ref: HTMLElement;
  private onRef = (ref: HTMLElement) => {
    this.ref = ref;
    ref && ref.appendChild(this.props.app.view);
  };

  private getSprite(): PIXI.extras.AnimatedSprite {
    // create an array of textures from an image path
    var frames = [];

    for (var i = 0; i < 30; i++) {
        var val = i < 10 ? '0' + i : i;

        // magically works since the spritesheet was loaded with the pixi loader
        frames.push(PIXI.Texture.fromFrame('rollSequence00' + val + '.png'));
    }

    this.props.app.ticker.add((d: number) => {
      anim.rotation += d * 0.01;
      let t = Date.now() % 4000;
      if (t > 2000)
        a2.position.x = (1000 - t % 2000) * 0.1;
      else
        a2.position.x = (t % 2000 - 1000) * 0.1;
    });
    // create an AnimatedSprite (brings back memories from the days of Flash, right ?)
    var anim = new PIXI.extras.AnimatedSprite(frames);
    anim.x = app.renderer.width / 2;
    anim.y = app.renderer.height / 2;
    anim.anchor.set(0.5);
    anim.animationSpeed = 0.5;
    //setInterval(() => anim.gotoAndStop(anim.currentFrame + 1), 200);
    anim.play();

    var a2 = new PIXI.extras.AnimatedSprite(frames);
    a2.scale.set(0.5, 0.5);
    anim.addChild(a2);

    this.props.app.stage.addChild(anim);
    return anim;
  }

  componentDidMount() {
    PIXI.loader.add('../data/fighter.json').load(() => {
      this.setState({sprite: this.getSprite()});
    });
  }

  render() {
    return (
      <div ref={this.onRef} style={{backgroundColor: 'silver'}}>
      </div>
    );
  }
}

let app = new PIXI.Application(800, 600, {backgroundColor : 0x1099bb});
ReactDOM.render(<PIXIView app={app}/>, getContainer());