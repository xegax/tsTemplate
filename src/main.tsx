/// <reference path='../typings/tsd.d.ts' />

import {ReactComponent} from './components/ReactComponent';
import React = require('react');

export function doTest(parentElement) {
  var content = 'text content';
  React.render(<ReactComponent>{content}</ReactComponent>, parentElement);
}