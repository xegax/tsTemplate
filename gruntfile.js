module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      dev: {
        src: ['build-tsx/**/*.ts', '!build-tsx/**/*Spec.ts', '!build-tsx/template/**/*'],
        outDir: 'build',
        options: {
          module: 'amd'
        }
      },
      tests: {
        src: ['build-tsx/**/*.ts', '!build-tsx/template/**/*'],
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
    'grunt-tsx': {
      dev: {
        ext: 'ts',
        srcDir: 'src',
        dstDir: 'build-tsx'
      }
    },
    clean: {
      build: ['build', 'build-tsx', 'specs', 'css/*.css'],
      all: ['build', 'build-tsx', 'specs', 'css/*.css', 'typings/jasmine', 'typings/react']
    }
  });
  
  grunt.loadNpmTasks('grunt-tsx');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-jasmine-nodejs');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-sass');
  
  grunt.registerTask('default', ['grunt-tsx:dev', 'ts:dev', 'sass:dev']);
  grunt.registerTask('tests', ['grunt-tsx:dev', 'ts:tests', 'jasmine_nodejs:dev']);
}