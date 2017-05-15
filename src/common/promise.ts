import * as Promise from 'promise';

export class Queue {
  private task: Promise<any>;
  private size: number = 0;

  static all(arr: Array<(data?) => any>): Promise<any> {
    return new Promise((resolve, reject) => {
      let queue: Promise<any> = arr[0]();

      for (let n = 1; n < arr.length; n++) {
        queue = queue.then(arr[n]);
      }

      queue.then(resolve).catch(reject);
    });
  }

  static allNoErrors(arr: Array<(data?) => any>): Promise<any> {
    return new Promise((resolve, reject) => {
      let queue: Promise<any> = arr[0]();

      for (let n = 1; n < arr.length; n++) {
        queue = queue.then(arr[n]).catch(() => {});
      }

      queue.then(resolve).catch(resolve);
    });
  }

  pushAndSkipError(taskMaker: (data?) => any) {
    const updateSize = () => {
      this.size--;
      if (this.size == 0)
        this.task = null;
    };

    const task = (data) => {
      updateSize();
      return taskMaker(data);
    };

    if (this.task == null) {
      this.task = new Promise(resolve => resolve(null)).then(task);
    } else {
      this.task = this.task.then(task).catch(() => {});
    }

    this.size++;
  }

  getSize() {
    return this.size;
  }
}
