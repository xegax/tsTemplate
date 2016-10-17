var fs = require('fs');
var full = JSON.parse(fs.readFileSync('full.json').toString());
console.log(full.length);
var itemsPerBuffer = 300;
var parts = Math.ceil(full.length / itemsPerBuffer);

function numToStr(n, digs) {
  if (digs == null)
    digs = 0;
  
  n = '' + n;
  while (n.length < digs)
    n = '0' + n;
  return n;
}

var columns = Object.keys(full[0]);
for (var n = 0; n < parts; n++) {
  var arr = full.slice(n * itemsPerBuffer, (n + 1) * itemsPerBuffer);
  console.log(n, arr.length);
  arr = arr.map((row) => columns.map((name) => row[name]));
  fs.writeFileSync('part-' + numToStr(n) + '.json', JSON.stringify(arr, null, 2));
}

var header = {
  rows: full.length,
  rowsPerPart: itemsPerBuffer,
  fileName: 'part-%d.json',
  columns
};
fs.writeFileSync('part-header.json', JSON.stringify(header, null, 2));