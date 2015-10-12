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
        src: ['src/**/*Spec.ts'],
        outDir: 'specs',
        options: {
          module: 'commonjs'
        }
      }
    },
    requirejs: {
      options: {
        baseUrl: 'build',
        paths: {
          'react': 'empty:'
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
    'jasmine_nodejs': {
      options: {
        specSuffix: 'Spec.js'
      },
      dev: {
        specs: 'specs/**'
      }
    },
    clean: {
      build: ['build', 'specs', 'css/*.css'],
      all: ['build', 'specs', 'css/*.css', 'typings/jasmine', 'typings/react', 'typings/d3']
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
  grunt.loadNpmTasks('grunt-sass');
  
  grunt.registerTask('default', ['ts:dev', 'makeIndex:dev', 'requirejs:dev','sass:dev']);
  grunt.registerTask('dev', ['default']);
  grunt.registerTask('tests', ['ts:dev', 'ts:tests', 'jasmine_nodejs:dev']);
}