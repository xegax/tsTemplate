import {Database} from 'sqlite3';
import * as fs from 'fs';
import * as Promise from 'promise';
import {DBPromise} from '../common/db-promise';
import {Queue} from '../common/promise';
import {assign} from 'lodash';

let db: DBPromise;
const dbFile = 'sqlite3-test.db';
const OBJ_TABLE = 'ObjTable';
const createObjTable = [
    `CREATE TABLE ${OBJ_TABLE}(`, [
    '  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE',
    '  type TEXT',
//    '  createTime TIMEDATE DEFAULT CURRENT_TIMESTAMP',
    '  intKey INTEGER',
    '  doubleKey REAL',
    '  uniqueStr TEXT UNIQUE'
    ].join(', '), ')'
  ].join('\n');

interface Row {
  id?: number;
  type?: string;
  intKey?: number;
  doubleKey?: number;
  uniqueStr?: string;
}

let currTime: number = Date.now();
function timer(s?: string) {
  const now = Date.now();
  const ms = now - currTime;
  currTime = now;
  s && console.log('   >>>>', s, 'in', ms / 1000);
}

function timerErr(t: number) {
  return new Promise((resolve, reject) => {
    setTimeout(reject, t);
  });
}

xdescribe('sqlite3', () => {

  fs.existsSync(dbFile) && fs.unlinkSync(dbFile);

  describe('init database', () => {

    it(`${dbFile} must not be exists`, () => {
      expect(fs.existsSync(dbFile)).toBeFalsy();
    });

    it('open database, init tables', done => {
      DBPromise.openOrCreate(dbFile).then(obj => {
        expect(db = obj).not.toBeNull();
      })
      .then(() => db.execSQL(createObjTable))
      .then(done);
    });
  
    it('insert 1000 rows', done => {
      timer();

      for (let n = 0; n < 1000; n++) {
        const row = {intKey: n, doubleKey: n / 1000, uniqueStr: 'str-' + n + 'xxxyyzzz'};
        db.addToQueue(() => db.insert(row, OBJ_TABLE));
      }

      db.addToQueue(() => {
        done();
        timer('insert 1000 rows complete');
        expect(db.getSizeOfQueue()).toBe(0);
      });
    });

    it('get 10000 objects', done => {
      timer();

      let checked = 0;
      for (let n = 0; n < 10000; n++) {
        const sql = `SELECT * FROM ${OBJ_TABLE} WHERE id = ${n + 1}`;
        db.addToQueue(() => {
          const task = db.getSQL<Row>(sql);
          task.then((row: Row) => {
            if (n >= 1000)
              return;
            checked++;
            expect(row).toEqual({id: n + 1, type: null, intKey: n, doubleKey: n / 1000, uniqueStr: 'str-' + n + 'xxxyyzzz'});
          });
          return task;
        });
      }
      
      db.addToQueue(() => {
        done();
        timer('get 10000 rows complete');
        expect(checked).toBe(1000);
        expect(db.getSizeOfQueue()).toBe(0);
      });
    });

    it('get 3 rows one by one', done => {
      let count = 0;
      db.addToQueue(() => Queue.all([
        () => {
          count++;
          return db.get(OBJ_TABLE, {keys: ['id'], cond: {id: 500}});
        },
        row => {
          count++;
          expect(row.id).toBe(500);
          return db.get(OBJ_TABLE, {keys: ['id'], cond: {id: row.id - 50}});
        },
        row => {
          count++;
          expect(row.id).toBe(500 - 50);
          return null;
        }
      ]));
      db.addToQueue(() => done());
    });

    it('insertAndGet', done => {
      let count = 0;
      let ids = [];
      while(count < 10) {
        count++;
        let row: Row = {
          type: 'ObjType' + count,
          intKey: count,
          doubleKey: count / 10,
          uniqueStr: 'str-' + count
        };
        db.addToQueue(() => db.insertAndGet(row, OBJ_TABLE).then((res: Row) => {
          ids.push(res.id);
          expect(res).toEqual(assign({id: res.id}, row));
          return res;
        }));
      }
      db.addToQueue(() => {
        return db.getAll<Row>(OBJ_TABLE, {cond: {id: ids}})
          .then(rows => {
            rows = rows.map(item => item.id);
            expect(rows).toEqual(ids);
          });
      });
      db.addToQueue(() => {
        done();
      });
    });
  });

  afterAll(() => {
    db.close();
  });
});