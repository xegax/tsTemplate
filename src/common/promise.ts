import * as Promise from 'promise';

export class Queue {
  private task: Promise<any>;
  private size: number = 0;

  static lastResult<T>(...arr: Array<(data?) => any>): Promise<T> {
    return Queue.all(...arr).then(arr => arr[arr.length - 1]);
  }

  static all(...arr: Array<(data?) => any>): Promise<Array<any>> {
    arr = arr.filter(item => item != null);
    if (!arr.length)
      return Promise.resolve(arr);

    return new Promise((resolve, reject) => {
      let queue: Promise<any> = new Promise((resolve, reject) => resolve(arr[0]()));

      let dataArr = [];
      for (let n = 1; n < arr.length; n++) {
        queue = queue.then((data) => {
          dataArr.push(data);
          return arr[n](data);
        });
      }

      queue.then((data) => {
        dataArr.push(data);
        resolve(dataArr);
      }).catch(data => {
        reject(data);
      });
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

export function timeout(msTime: number): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msTime);
  });
}
