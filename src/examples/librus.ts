import * as cp from 'child_process';
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as iconv from 'iconv-lite';
import {JSONStreamWriter} from './json-stream';

function endsWith(s: string, ends: string): boolean {
  return s.substr(s.length - ends.length) == ends;
}

function run7z(argsArr: Array<string>): Promise<{data: Buffer, error: string, code: number}> {
  return new Promise((resolve, reject) => {
    var outs = [];
    var errOuts = '';
    try {
      var io = cp.spawn('7z.exe', argsArr);
      io.stdout.on('data', data => outs.push(data));
      io.stderr.on('data', data => errOuts += data);
      io.on('exit', code => {
        if (code != 0)
          console.log(code, Buffer.concat(outs).toString());
        resolve({data: Buffer.concat(outs), error: errOuts, code});
      });
    } catch(e) {
      console.log(e);
      reject(e);
    }
  });
}

function parse7zList(data) {
  var arr = [];
  var pattern = '------------------- ----- ------------ ------------  ------------------------';
  var start = data.indexOf(pattern);
  if (start == -1)
    return arr;
  data = data.substr(start + pattern.length + 2);
  arr = data.split('\n');
  var statSumm = arr[arr.length - 2];
  var statSummArr = statSumm.trim().split(' ').filter(ch => ch != '');
  arr = arr.slice(0, arr.length - 3);
  if (+statSummArr[2] != arr.length)
    console.log('Array length different of archive description');
  return arr.map(line => {
    var values = line.trim().split(' ').filter(chr => chr != '');
    return {
      date: values[0], 
      time: values[1],
      attrs: values[2],
      size: values[3],
      compressed: values[4],
      file: values[5]
    };
  });
}

function extract(archive, file) {
  return new Promise((resolve, reject) => {
    run7z(['e', '-bd', '-so', archive, file]).then(desc => {
      if (desc.code == 0) {
        resolve(desc.data);
      } else {
        reject(desc.error);
      }
    }).catch(reject);
  });
}

function parallelTask(nextTask, maxTask) {
  return new Promise((resolve, reject) => {
    maxTask = maxTask || 5;
    var pool = [];

    function removeTask(task) {
      var i = pool.indexOf(task);
      if (i != -1) {
        pool.splice(i, 1);
      } else {
        console.log('task not found');
      }
      updatePool();
      if (pool.length == 0)
        resolve(null);
    }
    
    function addNextTask(task) {
      task.then(() => {
        removeTask(task);
      }).catch(e => {
        removeTask(task);
      });
      pool.push(task);
    }
    
    function updatePool() {
      while (pool.length < maxTask) {
        var taskPromise = nextTask();
        if (taskPromise)
          addNextTask(taskPromise);
        else
          break;
      }
    }
    
    updatePool();
  });
}

function extractEach(archive, fileCallback) {
  return new Promise((resolve, reject) => {
    run7z(['l', archive]).then(desc => {
      var list = parse7zList(desc.data.toString());
      var idx = 0;
      var stop = false;
      parallelTask(() => {
        var curr = idx;
        if (curr >= list.length || stop)
          return;
        idx++;
        
        return new Promise((resolve, reject) => {
          extract(archive, list[curr].file).then((data) => {
            try {
              var promise = fileCallback(data, list[curr], curr, list.length);
              if (promise) {
                promise
                  .then(resolve)
                  .catch(e => {
                    stop = true;
                    reject(e);
                  });
              } else {
                stop = true;
                resolve(null);
              }
            } catch(e) {
              stop = true;
              reject(e);
            }
          });
        });
      }, 10).then(resolve).catch(resolve);
    }).catch(reject);
  });
}

function parseFB2(buff, idx) {
  return new Promise((resolve, reject) => {
    var header = buff.slice(0, 100).toString().trim();
    if (header.substr(0, 6) != '<?xml ')
      return reject('invalid xml header start format');
    
    var end = header.indexOf('?>', 5);
    if (end == -1)
      return reject('invalid xml header end format');
    
    var encoding = 'utf8';
    header = header.substr(6, end - 6);
    var attrs = header.replace(/ +/g, ' ').trim().split(' ');
    for (var n = 0; n < attrs.length; n++) {
      if (attrs[n].startsWith('encoding=')) {
        encoding = attrs[n].split('=')[1];
        encoding = encoding.substr(1, encoding.length - 2);
        break;
      }
    }
    xml2js.parseString(iconv.decode(buff, encoding), {strict: true}, (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result);
      }
    });
  });
}

function checkArchive(archive: string, allTaskPerc) {
  //var archive = process.argv.slice(2)[0] || 'fb2-000065-572310_lost';
  var perc = 0;
  var fileCounter = 0;
  var errCounter = 0;
  var startTime = Date.now();

  var jsStrm = new JSONStreamWriter(archive + '.json', [
    'file', 'size', 'date', 'idx', 'json'
  ]);
  var errs = fs.createWriteStream('../' + archive + '-errs.txt');
  return extractEach(archive + '.zip', (data, fileItem, idx, total) => {
    var file = fileItem.file;
    console.log(archive, 'ok:', (fileCounter - errCounter), 'err:', errCounter, Math.round(fileCounter * 100 / total) + '%', 'total: ', allTaskPerc);
    fileCounter++;
    return parseFB2(data, idx).then(result => {
      var json = result['FictionBook']['description'];
      jsStrm.writeRow([file, +fileItem.size, fileItem.date, idx, JSON.stringify(json)]);
    }).catch(err => {
      errCounter++;
      errs.write(file + ', ' + idx + ', ' + (Date.now() - startTime) + ', error, ' + err + '\n');
      //console.log(err);
    });
  }).then(() => {
    jsStrm.close();
    errs.write('ok: ' + (fileCounter - errCounter)+ ', errs: ' + errCounter + ', time: ' + (Date.now() - startTime) / 1000);
  }).catch(e => {
    jsStrm.close();
    console.log(e)
  });
}

/*
var files = [];
fs.readdirSync('..').forEach(file => {
  if (!endsWith(file, '.zip'))
    return;

  var archive = file.substr(0, file.length - 4);
  if (fs.existsSync('../' + archive + '.json'))
    return;
  
  files.push(file);
});

function nextArchive() {
  if (files.length == 0)
    return;
  var file = files[0]
  file = file.substr(0, file.length - 4);
  files.splice(0, 1);
  checkArchive(file, files.length).then(() => {
    nextArchive();
  });
}

nextArchive();*/
checkArchive('fb2-153556-158325', 0);