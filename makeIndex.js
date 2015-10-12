module.exports = function(grunt) {
  grunt.registerMultiTask('makeIndex', 'Make index of all files.', function() {
    var props = grunt.config(this.name + '.' + this.target);

    var path = require('path');
    var modules = [];
    this.filesSrc.forEach(function(filepath) {
      if (!grunt.file.exists(filepath))
        return;
      
      filepath = path.relative(props.baseUrl, filepath);
      
      var dir = path.dirname(filepath);
      if (dir === '.')
        dir = '';
      else
        dir += '/';
      modules.push('"' + dir + path.basename(filepath, '.js') + '"');
    });
    
    var fs = require('fs');
    var out = 'define([' + modules.join(',\n\t') + '], function() {\n});';
    fs.writeFileSync(props.dest, out);

    grunt.log.ok(this.filesSrc.length  + ' ' + grunt.util.pluralize(this.filesSrc.length, 'path/paths') + ' indexed.');
  });
};
