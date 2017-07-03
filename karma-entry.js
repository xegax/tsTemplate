var tests = [];
Object.keys(window.__karma__.files).forEach(function(file) {
  if (/-spec\.js$/.test(file)) {
    tests.push(file);
  }
});

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: '/base/src',

    paths: {
      'd3': '../vendor/d3/d3',
      'lodash': '../vendor/lodash/lodash',
      'react': '../vendor/react/react',
      'react-dom': '../vendor/react/react-dom',
      'react-dom/server': '../vendor/react/react-dom-server',
      'promise': '../vendor/bluebird.min'
    },

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start
});