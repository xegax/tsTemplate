module.exports = function(grunt) {
  require('./makeIndex')(grunt);
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      dev: {
        src: ['src/**/*'],
        outDir: 'build',
        options: {
          module: 'amd',
          additionalFlags: '--jsx react'
        }
      },
      tests: {
        src: ['specs/**/*Spec.ts', 'specs/**/*Spec.tsx'],
        outDir: 'build',
        options: {
          module: 'amd',
          additionalFlags: '--jsx react'
        }
      }
    },
    requirejs: {
      options: {
        baseUrl: 'build',
        paths: {
          'react': 'empty:',
          'd3': 'empty:'
        }
      },
      dev: {
        options: {
          optimize: 'none',
          name: 'index',
          out: 'build/out.js'
        }
      },
      dist: {
        options: {
          optimize: 'uglify2'
        }
      }
    },
    sass: {
      dev: {
        files: {
          'css/main.css': 'css/main.sass'
        }
      }
    },
    jasmine: {
      default: {
        src: ['build/specs/*Spec.js'],
        options: {
          template: require('grunt-template-jasmine-requirejs'),
          templateOptions: {
            requireConfig: {
              baseUrl: 'build/src',
              paths: {
                'd3': '../../vendor/d3/d3',
                'react': '../../vendor/react/react',
                'phantom-bind-polyfill': '../../node_modules/phantomjs-polyfill/bind-polyfill'
              },
              shim: {
                'd3': {
                  'exports': 'd3'
                }
              },
              deps: ['phantom-bind-polyfill']
            }
          }
        }
      }
    },
    clean: {
      build: ['build', 'css/*.css'],
      all: ['build', 'css/*.css', 'typings/jasmine', 'typings/react', 'typings/d3']
    },
    makeIndex: {
      dev: {
        baseUrl: 'build',
        src: ['build/**/*.js'],
        dest: 'build/index.js'
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-jasmine-nodejs');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-sass');
  
  grunt.registerTask('default', ['clean:build', 'ts:dev', 'makeIndex:dev', 'requirejs:dev','sass:dev']);
  grunt.registerTask('dev', ['default']);
  grunt.registerTask('tests', ['clean:build', 'ts:tests', 'jasmine']);
}