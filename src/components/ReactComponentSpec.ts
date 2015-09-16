import {ReactComponent} from './ReactComponent';
import React = require('react');

describe('ReactComponent', function() {
  it('ReactComponent', function() {
    expect(ReactComponent).not.toBeUndefined();
    console.log(React.renderToString(<ReactComponent/>)));
  });
});