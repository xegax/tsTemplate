import {Timer} from './timer';

type Callback = (eventBits: number, publisher: Publisher) => void;

export class Publisher {
  private version: number = 0;
  private subscribers = Array<Callback>();
  private eventsMask: number = 0;
  private timer: Timer;

  constructor(prev?: Publisher, timer?: Timer) {
    if (timer) {
      this.timer = timer;
    } else {
      this.timer = new Timer();
    }
    this.timer.addUniqueCallback(() => this.notifySubscribers());
    
    // subscribers moved from prev
    if (prev) {
      prev.subscribers.forEach(s => this.addSubscriber(s));
      prev.removeAllSubscribers();
    }
  }

  addSubscriber(callback: Callback) {
    if (this.subscribers.indexOf(callback) != -1)
      return;
    this.subscribers.push(callback);
  }

  removeSubscriber(callback: Callback) {
    let i = this.subscribers.indexOf(callback);
    if (i == -1)
      return;
    this.subscribers.splice(i, 1);
  }

  removeAllSubscribers() {
    this.subscribers.splice(0, this.subscribers.length);
  }

  hasSubscriber(callback: Callback) {
    return this.subscribers.indexOf(callback) != -1;
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
        this.subscribers[n](this.eventsMask, this);
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
