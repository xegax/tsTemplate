declare module 'jasmine-spec-reporter' {
  export class SpecReporter implements jasmine.Reporter {
    constructor(json);
    reportRunnerStarting(runner): void;
    reportRunnerResults(runner): void;
    reportSuiteResults(suite): void;
    reportSpecStarting(spec): void;
    reportSpecResults(spec): void;
    log(str: string): void;
  }
}