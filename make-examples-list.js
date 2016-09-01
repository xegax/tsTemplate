module.exports = function(grunt) {
  grunt.registerMultiTask('make-examples-list', 'Make list of examples.', function() {
    var src = this.data.src || 'src';
    var dst = this.data.dst || 'src/examples-main/examples-list.ts';

    var list = makeList(src, dst);
    grunt.log.ok(list.length + ' examples found.');
  });
};

function makeList(src, dst) {
  var fs = require('fs');
  var path = require('path').posix;

  var dirs = [];
  var tgtDir = src + '/examples';
  if (fs.existsSync(tgtDir) && fs.lstatSync(tgtDir).isDirectory())
    dirs.push(tgtDir);

  fs.readdirSync(src).forEach(function(fileOrDir) {
    var filePath = src + '/' + fileOrDir;
    var stat = fs.lstatSync(filePath);
    filePath = filePath + '/examples';
    if (stat.isDirectory() && fs.existsSync(filePath)) {
      dirs.push(filePath);
    }
  });

  var files = [];
  dirs.forEach(function(path) {
    files = files.concat(getFilesRecursively(path));
  });
  var outData = '';
  files.forEach(function(file, i) {
    outData += '  \'' + file + '\'';
    if (i != files.length - 1) {
      outData += ',\n';
    }
  });
  fs.writeFileSync(dst, 'export let examplesList = [\n' + outData + '\n];\n');

  function getFilesRecursively(dir) {
    var files = [];
    fs.readdirSync(dir).forEach(function(fileOrDir) {
      var filePath = dir + '/' + fileOrDir;
      var stat = fs.lstatSync(filePath);
      if (stat.isDirectory()) {
        files = files.concat(getFilesRecursively(filePath));
        return;
      }

      if (['.ts', '.tsx'].indexOf(path.extname(filePath).toLocaleLowerCase()) == -1) {
        return;
      }

      if (path.basename(filePath).indexOf('helper-') == 0) {
        return;
      }

      if (path.basename(filePath).indexOf('data-') == 0) {
        return;
      }

      pathSpec = path.parse(path.relative(src, filePath));
      files.push(pathSpec.dir + '/' + pathSpec.name);
    });
    return files;
  }

  return files;
};
