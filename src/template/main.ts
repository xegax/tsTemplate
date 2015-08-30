import ReactComponent = require('reactComponent');
import React = require('react');

export function doTest(parentElement) {
  var content = 'text content';
  React.render(JSX(`<ReactComponent.Widget>{content}</ReactComponent.Widget>`), parentElement);
}