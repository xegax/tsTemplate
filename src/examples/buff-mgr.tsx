import {assign} from 'lodash'; 
 
interface BufferSource {
  load(): Promise.IThenable<BufferSource>;
}

class VideoSource {
  protected url: string;
  protected el: HTMLVideoElement;

  constructor(url: string) {
    this.url = url;
    this.el = document.createElement('video');
  }

  load() {
    this.el.setAttribute('src', this.url);
    return new Promise((resolve, reject) => {
      this.el.addEventListener('canplay', () => {
        resolve(this);
      });
      this.el.addEventListener('error', (event) => {
        reject(event);
      });
    });
  }

  getElement(): HTMLVideoElement {
    return this.el;
  }
}

interface Args {
  buffNum: number;
}

interface BuffHolder {
  idx: number;
  buff: BufferSource;
}

class Mgr {
  private args: Args;
  private buff = Array<BuffHolder>();
  private loaded = Array<BuffHolder>();
  private idx: number = 0;
  private pause: boolean = true;
  private loadIdx: number = 0;

  private nextCallback: (idx: number) => BufferSource;
  private loadCallback: (buff: BufferSource) => void;

  constructor(args?: Args) {
    this.args = assign({buffNum: 5}, args);
  }

  onNextSource(callback: (idx: number) => BufferSource) {
    this.nextCallback = callback;
  }

  onLoaded(callback: (buff: BufferSource) => void) {
    this.loadCallback = callback;
  }

  private findBuffer(buff: BufferSource): number {
    for (let n = 0; n < this.buff.length; n++) {
      if (this.buff[n].buff == buff)
        return n;
    }
    return -1;
  }

  private removeBuffer(buff: BufferSource) {
    let i = this.findBuffer(buff);
    if (i == -1) {
      console.log('something wrong', buff);
    } else {
      this.loaded.push(this.buff.splice(i, 1)[0]);
      this.loaded.sort((a, b) => a.idx - b.idx);
      if (this.loaded[this.loadIdx].idx == this.loadIdx) {
        console.log('playing', this.loadIdx);
        this.loadIdx++;
      }
    }
    this.load();
  }

  private addToLoad(idx: number, buff: BufferSource) {
    this.buff.push({idx, buff});
    buff.load().then(() => {
      this.removeBuffer(buff);
      //console.log('loaded', idx);
    }).catch(() => {
      console.log('fail', idx);
      let i = this.findBuffer(buff);
      if (i != -1) {
        this.buff.splice(i, 1);
        this.load();
      }
    });
  }

  private load() {
    if (this.pause)
      return;

    while (this.buff.length < this.args.buffNum) {
      let src = this.nextCallback(this.idx);
      if (src == null) {
        this.pause = true;
        break;
      }
      this.addToLoad(this.idx, src);
      this.idx++;
    }
  }

  start() {
    this.pause = false;
    this.load();
  }

  getLoaded() {
    return this.loaded;
  }
}

function numToStr(n: number, digs = 3) {
  let v = '' + n;
  while (v.length < digs)
    v = '0' + v;
  return v;
}

let mgr = new Mgr();  // 5 параллельных потоков 
mgr.onNextSource((n: number) => {
  if (n < 42)
    return new VideoSource('../data/file' + numToStr(n) + '.mp4');
  // console.log(mgr.getLoaded());
  return null;
});
mgr.start();