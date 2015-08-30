import ReactComponent = require('./reactComponent');
import React = require('react');

describe('ReactComponent', function() {
  it('ReactComponent.Widget', function() {
    expect(ReactComponent.Widget).not.toBeUndefined();
    console.log(React.renderToString(JSX(`<ReactComponent.Widget/>`)));
  });
});