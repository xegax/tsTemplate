module.exports = function(grunt) {
  require('./make-examples-list')(grunt);
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    ts: {
      default: {
        tsconfig: true
      }
    },
    requirejs: {
      options: {
        baseUrl: 'src',
        paths: {
          'react': 'empty:',
          'd3': 'empty:'
        }
      },
      dev: {
        options: {
          optimize: 'none',
          name: 'controls',
          out: 'build/controls.js'
        }
      },
      dist: {
        options: {
          optimize: 'uglify2'
        }
      }
    },
    'make-examples-list': {
      default: {
        src: 'src',
        dst: 'src/examples/data-examples.ts'
      }
    },
    sass: {
      default: {
        files: {
          'build/styles.css': 'styles/styles.scss'
        }
      }
    },
    clean: {
      default: ['build', 'styles/*.css', 'src/*/*.js', 'src/*/*.js.map']
    }
  });
  
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-sass');
  
  grunt.registerTask('default', ['clean', 'make-examples-list', 'ts', 'requirejs:dev','sass']);
  grunt.registerTask('dev', ['default']);
}