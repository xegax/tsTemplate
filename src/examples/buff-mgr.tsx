import {assign} from 'lodash';
import {getContainer} from 'examples-main/helpers';
 
interface BufferSource {
  load(): Promise<BufferSource>;
}

class VideoSource implements BufferSource {
  protected url: string;
  protected el: HTMLVideoElement;

  constructor(url: string) {
    this.url = url;
    this.el = document.createElement('video');
  }

  load(): Promise<BufferSource> {
    return new Promise((resolve, reject) => {
      this.el.addEventListener('canplay', () => {
        resolve(this);
      });
      this.el.addEventListener('error', (event) => {
        reject(event);
      });
      this.el.setAttribute('src', this.url);
    });
  }

  getElement(): HTMLVideoElement {
    return this.el;
  }

  getUrl() {
    return this.url;
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

  private findBuffer(buff: BufferSource, arr: Array<BuffHolder>): number {
    for (let n = 0; n < arr.length; n++) {
      if (arr[n].buff == buff)
        return n;
    }
    return -1;
  }

  removeBuffer(buff: BufferSource) {
    [this.buff, this.loaded].forEach(arr => {
      let i = this.findBuffer(buff, arr);
      if (i == -1) {
        console.log('something wrong', buff);
      } else {
        arr.splice(i, 1);
      }
    });
    this.nextLoaded();
    this.load();
  }

  private nextLoaded() {
    if (this.loaded.length == 0)
      return;

    let idx = this.loaded[0].idx;
    let buff = this.loaded[0].buff;
    if (this.loadIdx != idx)
      return;
    
    console.log('loading', this.buff.length, 'loaded', this.loaded.length);
    this.loadCallback(buff);
    this.loadIdx++;
  }

  private onLoadedImpl(idx: number, buff: BufferSource) {
    this.loaded.push({idx, buff});
    this.loaded.sort((a, b) => a.idx - b.idx);
    this.nextLoaded();
  }

  private addToLoad(idx: number, buff: BufferSource) {
    this.buff.push({idx, buff});
    buff.load().then(() => {
      this.onLoadedImpl(idx, buff);
    }).catch(() => {
      let i = this.findBuffer(buff, this.buff);
      if (i != -1) {
        this.buff.splice(i, 1);
        this.pause = true;
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
}

function numToStr(n: number, digs = 3) {
  let v = '' + n;
  while (v.length < digs)
    v = '0' + v;
  return v;
}

// обеспечивает упорядоченную паралелльную загрузку
// onNextSource = [file1, file2, file3, ...]
// onLoaded = [file1, file2, file3, ...]
let mgr = new Mgr({buffNum: 5});  // 5 параллельных потоков 
mgr.onNextSource((n: number) => {
  return new VideoSource('../data/video/out' + numToStr(n) + '.mp4');
});

let cont = getContainer();

mgr.onLoaded((buff: VideoSource) => {
  let vid = buff.getElement();
  vid.addEventListener('ended', () => {
    mgr.removeBuffer(buff);
  });
  vid.play();
  vid.addEventListener('play', () => {
    if (cont.firstChild)
      cont.removeChild(cont.firstChild);
    cont.appendChild(vid);
    console.log('play');
  });
});

mgr.start();