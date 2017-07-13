import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {getContainer} from 'examples-main/helpers';
import {getGlobalRequestor} from 'requestor/requestor';

interface Props {
}

interface State {
  iter: number;
}

let Architect: any = (window as any).synaptic.Architect;

let tmpCanvas = document.createElement('canvas');

class Test extends React.Component<Props, State> {
  context: CanvasRenderingContext2D;
  trial: number = 0;
  trainingStarted: boolean = false;
  perceptron: any;
  disableTrain: boolean;
  size = 125 * 125;
  color_data: Uint8ClampedArray;
  filtered_data: Uint8ClampedArray;
  original_data: Uint8ClampedArray;
  img1: HTMLImageElement;
  fullData: Array<Array<number>>;

  constructor(props) {
    super(props);
    this.state = {iter: 0};
  }

  getData(imageObj: HTMLImageElement) {
		let context = tmpCanvas.getContext('2d');
    context.drawImage(imageObj, 0, 0);

    var imageData = context.getImageData(0, 0, 125, 125);
    return imageData.data;
	}

  iteration() {
    let color_data = this.color_data;
    let time = Date.now();
    while(Date.now() - time < 300) {
      this.trial++;
      for (let n = 0; n < this.fullData.length; n++) {
        this.perceptron.activate(this.fullData[n]);
        this.perceptron.propagate(.12, this.pixel(this.filtered_data, 0,0, n * 2));
      }
    }
    console.log(this.trial);

    //if (this.trial % 300 == 0)
		this.preview();
    this.setState({iter: this.trial});

    setTimeout(() => this.iteration(), 1);
	}

  train() {
		this.disableTrain = true;
		this.trial = 0;
		this.perceptron = new Architect.Perceptron(27, 8, 3);

    this.context.drawImage(this.img1, 0, 0);

		if (!this.trainingStarted) {
			this.trainingStarted = true;
      this.fullData = this.prepareFull();
			this.iteration();
		}
	}

  pixel(data: Uint8ClampedArray, ox: number, oy: number, index: number) {
		let y = index / 125 | 0;
		let x = index % 125;

		if (ox && (x + ox) > 0 && (x + ox) < 125)
			x += ox;
		if (oy && (y + oy) > 0 && (y + oy) < 125)
			y += oy;

    let i = ((125 * y) + x) * 4;
		let red = data[i];
    let green = data[i + 1];
    let blue = data[i + 2];

    return [red / 255, green / 255, blue / 255];
	}

  prepareFull(): Array<Array<number>> {
    let arr = Array<Array<number>>();
    for (let index = 0; index < this.size; index+=2) {
			let px = this.pixel(this.color_data, 0, 0, index);
      px = px.concat(this.pixel(this.color_data, -1, -1, index));
      px = px.concat(this.pixel(this.color_data, 0, -1, index));
      px = px.concat(this.pixel(this.color_data, 1, -1, index));
      px = px.concat(this.pixel(this.color_data, -1, 0, index));
      px = px.concat(this.pixel(this.color_data, 1, 0, index));
      px = px.concat(this.pixel(this.color_data, -1, 1, index));
      px = px.concat(this.pixel(this.color_data, 0, 1, index));
      px = px.concat(this.pixel(this.color_data, 1, 1, index));
      arr.push(px);
		}
    return arr;
  }
  
  preview() {
    let original_data = this.original_data;
		var imageData = this.context.getImageData(0, 0, 125, 125);
		for (let index = 0; index < this.size; index++) {
			var px = this.pixel(original_data, 0, 0, index);
			px = px.concat(this.pixel(original_data, -1, -1, index));
			px = px.concat(this.pixel(original_data, 0, -1, index));
			px = px.concat(this.pixel(original_data, 1, -1, index));
			px = px.concat(this.pixel(original_data, -1, 0, index));
			px = px.concat(this.pixel(original_data, 1, 0, index));
			px = px.concat(this.pixel(original_data, -1, 1, index));
			px = px.concat(this.pixel(original_data, 0, 1, index));
			px = px.concat(this.pixel(original_data, 1, 1, index));
			var rgb = this.perceptron.activate(px);
			imageData.data[index * 4] = (rgb[0] )* 255;
			imageData.data[index * 4 + 1] = (rgb[1] ) * 255;
			imageData.data[index * 4 + 2] = (rgb[2] ) * 255;
		}
		this.context.putImageData(imageData,0,0);
	}

  onStart = () => {
    getGlobalRequestor().getJSON('../data/net.json').then(data => {
      this.train();
      for (let key in data) {
        this.perceptron.optimized.memory[+key] = data[key];
      }
    });
  }

  render() {
    return (
      <div>
        <img onLoad={e => this.color_data = this.getData(e.target as HTMLImageElement)} src='../images/image1.png'/>
        <img onLoad={e => this.filtered_data = this.getData(e.target as HTMLImageElement)} src='../images/image1-filtered.png'/>
        <img onLoad={e => {this.original_data = this.getData(e.target as HTMLImageElement); this.img1 = e.target as any; }} src='../images/image2.png'/>
        <canvas ref={(e: HTMLCanvasElement) => e ? this.context = e.getContext('2d') : this.context} width={125} height={125}/>
        <div>
          <button onClick={this.onStart}>start</button>
          <div>{this.state.iter}</div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Test/>, getContainer());