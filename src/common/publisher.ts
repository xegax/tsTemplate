import {Timer} from './timer';

type Callback = (eventBits: number, publisher: Publisher) => void;

interface CallbackHolder {
  order: number;
  callback: Callback;
}

export class Publisher {
  static readonly ORDER_BEGIN = 0;
  static readonly ORDER_MIDDLE = 1;
  static readonly ORDER_END = 2;

  private version: number = 0;
  private subscribers = Array<CallbackHolder>();
  private eventsMask: number = 0;
  private timer: Timer;

  constructor(timer?: Timer) {
    if (timer) {
      this.timer = timer;
    } else {
      this.timer = new Timer();
    }
    this.timer.addUniqueCallback(() => this.notifySubscribers());
  }

  moveSubscribersFrom(from: Publisher) {
    from.subscribers.forEach(s => this.addSubscriber(s.callback));
    from.removeAllSubscribers();
  }

  addSubscriber(callback: Callback, order: number = Publisher.ORDER_BEGIN) {
    if (this.getSubscriberIndex(callback) != -1)
      return;

    this.subscribers.push({callback, order});
    this.subscribers.sort((a, b) => a.order - b.order);
  }

  removeSubscriber(callback: Callback) {
    let n = this.getSubscriberIndex(callback);
    if (n == -1)
      return;
    
    this.subscribers.splice(n, 1);
    this.subscribers.sort((a, b) => a.order - b.order);
  }

  removeAllSubscribers() {
    this.subscribers.splice(0, this.subscribers.length);
  }

  getSubscriberIndex(callback: Callback): number {
    for (let n = 0; n < this.subscribers.length; n++) {
      if (this.subscribers[n].callback == callback)
        return n;
    }

    return -1;
  }

  getSubscriberCount() {
    return this.subscribers.length;
  }

  updateVersion(eventBits: number, timeToNotify: number = 0) {
    this.eventsMask |= eventBits;
    this.version++;

    if (timeToNotify == 0) {
      this.notifySubscribers();
    } else {
      this.timer.run(timeToNotify);
    }
  }

  notifySubscribers(): void {
    this.timer.stop();
    for (let n = 0; n < this.subscribers.length; n++) {
      try {
        this.subscribers[n].callback(this.eventsMask, this);
      } catch (e) {
        console.log(e);
      }
    }
    this.eventsMask = 0;
  }

  getVersion(): number {
    return this.version;
  }

  resetVersion() {
    this.version = 0;
  }

  getEventsMask() {
    return this.eventsMask;
  }
}
