module.exports = function(grunt) {
  function tsConfig(config) {
    config.ts = {
      default: {
        tsconfig: true
      }
    };
  }
  
  function watchConfig(config) {
    var tsCache = require('./node_modules/grunt-ts/tasks/modules/cacheUtils');
    grunt.event.on('watch', function(action, filepath, target) {
      if (target !== 'ts') {
        return;
      }

      tsCache.clearCache('single');
      grunt.config('ts.single.src', ['typings/tsd.d.ts', filepath]);
    });
    
    config.watch = {
      ts: {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        tasks: ['ts:single'],
        options: {
          spawn: false
        }
      },
      styles: {
        files: ['styles/**/*.scss'],
        tasks: ['sass']
      },
      options: {
        livereload: {
          host: 'localhost',
          port: 35729
        }
      }
    };
    
    config.ts.single = {
      options: {
        target: 'es3',
        module: 'amd',
        sourceMap: true,
        removeComments: false,
        jsx: 'react',
        moduleResolution: 'classic',
        experimentalDecorators: true
      },
      src: []
    };
  }
  
  function makeExamplesConfig(config) {
    require('./make-examples-list')(grunt);
    
    config['make-examples-list'] = {
      default: {
        src: 'src',
        dst: 'src/examples-main/examples-list.ts'
      }
    };
  }
  
  function sassConfig(config) {
    config.sass = {
      default: {
        files: {
          'build/styles.css': 'styles/styles.scss'
        }
      }
    };
  }
  
  function cleanConfig(config) {
    config.clean = {
      default: ['build', 'styles/*.css', 'src/*/*.js', 'src/*/*.js.map']
    };
  }
  
  function tslintConfig(config) {
    config.tslint = {
      options: {
        configuration: grunt.file.readJSON('tslint.json')
      },
      all: {
        src: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/data-example-*.ts']
      }
    };
  }
  
  function karmaConfig(config) {
    config.karma = {
      unit: {
        configFile: 'karma.conf.js'
      }
    };
  }
  
  var config = {
    pkg: grunt.file.readJSON('package.json')
  };
  
  tsConfig(config);
  watchConfig(config);
  makeExamplesConfig(config);
  sassConfig(config);
  cleanConfig(config);
  tslintConfig(config);
  karmaConfig(config);
  
  grunt.initConfig(config); 
  require('load-grunt-tasks')(grunt);
  
  grunt.registerTask('default', ['clean', 'make-examples-list', 'ts', 'sass']);
  grunt.registerTask('dev', ['default']);
  grunt.registerTask('debug', ['default', 'watch']);
}