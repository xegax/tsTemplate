var fs = require('fs');

var arr = JSON.parse(fs.readFileSync('gamefaq.ps-detailed.json').toString());
var columns = {};
arr.forEach(row => Object.keys(row).forEach(key => columns[key] = 0));
Object.keys(columns).forEach((col, i) => columns[col] = i);
arr = arr.map(row => {
  var resRow = Array(columns.length);
  Object.keys(row).forEach(key => resRow[columns[key]] = row[key]);
  return resRow;
});

arr = [Object.keys(columns)].concat(arr);
fs.writeFileSync('ps-detailed.json', JSON.stringify(arr, null, 2));