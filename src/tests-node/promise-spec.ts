import {Queue} from '../common/promise';

function timerTask(ms: number, callback?: () => any): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      //console.log('task', ms);
      resolve(callback && callback());
    }, ms);
  });
}

function errorTask(ms: number, callback?: () => any): Promise<any> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      //console.log('err', ms);
      reject(callback && callback());
    }, ms);
  });
}

describe('common/promise', () => {
  describe('queue', () => {
    it('timerTask', done => {
      timerTask(50, done);
    });

    it('queue without error', done => {
      let order = [];
      Queue.all([
        () => timerTask(3, () => {
          order.push(0);
          return 5;
        }),
        (data: number) => {
          expect(data).toBe(5);
          return timerTask(3, () => {
            order.push(1);
            return 'xxyy';
          })
        },
        (data: string) => {
          expect(data).toBe('xxyy');
          return timerTask(3, () => {
            order.push(2);
            return {id: 111};
          })
        },
        data => {
          expect(data).toEqual({id: 111});
          return timerTask(3, () => order.push(3));
        }
      ]).then((data) => {
        expect(data).toBe(4);
        done();
        expect(order).toEqual([0, 1, 2, 3]);
      });
    });

    it('queue with error', done => {
      let order = [];
      Queue.all([
        () => timerTask(3, () => order.push(0)),
        () => timerTask(3, () => order.push(1)),
        () => errorTask(3),
        () => timerTask(4, () => order.push(2))
      ]).then(() => {
        expect('must not be called').toBeNull();
      }).catch(() => {
        expect(order).toEqual([0, 1]);
        done();
      });
    });

    it('multiple queue, withot errors', done => {
      let order = [];
      Queue.all([
        () => Queue.all([
          () => timerTask(3, () => order.push(0)),
          () => timerTask(3, () => order.push(1)),
          () => timerTask(3, () => order.push(2))
        ]),
        () => Queue.all([
          () => timerTask(3, () => order.push(3)),
          () => timerTask(3, () => order.push(4))
        ]),
        () => Queue.all([
          () => timerTask(3, () => order.push(5)),
          () => timerTask(3, () => order.push(6)),
          () => timerTask(3, () => order.push(7))
        ]),
      ]).then(() => {
        expect(order).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
        done();
      });
    });

    it('multiple queue, with errors', done => {
      let order = [];
      Queue.allNoErrors([
        () => Queue.all([
          () => timerTask(3, () => order.push(0)),
          () => errorTask(3),
          () => timerTask(3, () => order.push(1)),
        ]),
        () => Queue.all([
          () => errorTask(3),
          () => timerTask(3, () => order.push(2)),
          () => timerTask(3, () => order.push(3))
        ]),
        () => Queue.all([
          () => timerTask(3, () => order.push(4)),
          () => errorTask(3),
          () => timerTask(3, () => order.push(5))
        ]),
        () => Queue.all([
          () => timerTask(3, () => order.push(6)),
          () => timerTask(3, () => order.push(7)),
          () => errorTask(3),
          () => timerTask(3, () => order.push(8))
        ]),
      ]).then(() => {
        expect(order).toEqual([0, 4, 6, 7]);
        done();
      });
    });

    it('allNoErrors', done => {
      let order = [];
      Queue.allNoErrors([
        () => timerTask(10, () => order.push(0)),
        () => Queue.all([
          () => timerTask(20, () => {
            order.push(2);
          }),
          () => errorTask(30),
          () => timerTask(40, () => order.push(4)),
        ])
      ]).then(() => {
        done();
        expect(order).toEqual([0, 2]);
      });
    });

    it('pushAndSkipError', done => {
      let order = [];
      let queue = new Queue();
      queue.pushAndSkipError(() => Queue.all([
        () => timerTask(1, () => order.push(0)),
        () => timerTask(2, () => order.push(1))
      ]));
      queue.pushAndSkipError(() => Queue.all([
        () => timerTask(3, () => order.push(2)),
        () => timerTask(4, () => order.push(3)),
        () => errorTask(5),
        () => timerTask(6, () => order.push(4)),
      ]));
      queue.pushAndSkipError(() => Queue.all([
        () => errorTask(7),
        () => timerTask(8, () => order.push(5)),
        () => timerTask(9, () => order.push(6))
      ]));
      queue.pushAndSkipError(() => Queue.all([
        () => timerTask(10, () => order.push(7))
      ]));
      queue.pushAndSkipError(() => {
        done();
        expect(queue.getSize()).toBe(0);
        expect(order).toEqual([0, 1, 2, 3, 7]);
      });
    });

    it('pushAndSkipError, recursion', done => {
      let count = 0;
      let queue = new Queue();
      const nextTask = () => {
        count++;
        if (count > 500)
          return done();

        queue.pushAndSkipError(() => {
          expect(queue.getSize()).toBe(0);
          timerTask(1, nextTask)
        });
      }

      nextTask();
    });
  });
});