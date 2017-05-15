var sql = require('sqlite3');
var Promise = require('bluebird');
var db = new sql.Database('--test.db');

db.serialize(() => {
  db.exec('CREATE TABLE IF NOT EXISTS objects(id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, name TEXT)', (err) => {
    err && console.log(err);
  });
});

var ids = ['127739', '200293', '230950', '33726', '117520', '209490', '230950'];
var task = null;
var process = 0;
var maxProcess = 0;
function getRowsImpl(ser, idx) {
  var arr = [];
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      process++;
      maxProcess = Math.max(maxProcess, process);
      arr.push('idx-' + idx);
      for (let n = 0; n < ids.length; n++) {
        db.get(`SELECT id FROM books WHERE id=${ids[n]}`, (err, row) => {
          arr.push(row.id);
          if (arr.length == ids.length) {
            process--;
            resolve(arr);
          }
        });
      }
    });
  });
}

function insertAndGet(name) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.exec(`INSERT INTO objects(name) VALUES("${name}")`, (err) => {
        err && console.log(err);
      });
      db.all('SELECT * FROM objects WHERE _rowid_==last_insert_rowid()', (err, rows) => {
        err && console.log(err);
        resolve(rows);
      });
    });
  });
}

function getRows(ser, idx) {
  var arr = [];
  
  let grTask = getRowsImpl(ser, idx);
  
  if (task) {
    return Promise.all([task, grTask]).then(arr => arr[1]);
  } else {
    return task = grTask.then((arr) => {task = null; return arr;} );
  }
}

for (let n = 0; n < 10; n++)
  insertAndGet('name-' + n).then(rows => console.log(rows));
