module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      dev: {
        src: ['src/main.tsx'],
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
    }
  });
  
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-jasmine-nodejs');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-sass');
  
  grunt.registerTask('default', ['ts:dev', 'sass:dev']);
  grunt.registerTask('dev', ['ts:dev', 'sass:dev']);
  grunt.registerTask('tests', ['ts:dev', 'ts:tests', 'jasmine_nodejs:dev']);
}