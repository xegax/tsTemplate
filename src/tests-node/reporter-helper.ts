import {SpecReporter} from 'jasmine-spec-reporter';
const Jasmine = require('jasmine');

let env = jasmine.getEnv();
env.clearReporters();
env.addReporter(new SpecReporter({
  spec: {
    displayPending: true
  }
}) as any);