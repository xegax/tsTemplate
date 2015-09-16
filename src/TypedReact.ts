import React = require('react');

class Mixin<P, S> implements React.Mixin<P, S> {
  refs: {
      [key: string]: React.Component<any, any>;
  };
  props: P;
  state: S;
  context: any;
  
  getDOMNode(): Element {
    throw "not implemented getDOMNode";
  }
  
  setState(nextState: S | ((prevState: S, props: P) => S), callback?: () => void): void {
    throw "not implemented setState";
  }
  
  replaceState(nextState: S, callback?: () => void): void {
    throw "not implemented replaceState";
  }
  
  forceUpdate(callback?: () => void): void {
    throw "not implemented forceUpdate";
  }
  
  isMounted(): boolean {
    throw "not implemented isMounted";
  }
  
  setProps(nextProps: P, callback?: () => void): void {
    throw "not implemented setProps";
  }
  
  replaceProps(nextProps: P, callback?: () => void): void {
    throw "not implemented replaceProps";
  }
}

export class Component<P, S> extends Mixin<P, S> implements React.ClassicComponent<P, S> {
  render(): React.ReactElement<any> {
    throw "not implemented render";
  }
}

var ILLEGAL_KEYS = {
  constructor: true,
  refs: true,
  props: true,
  state: true,
  getDOMNode: true,
  setState: true,
  replaceState: true,
  forceUpdate: true,
  isMounted: true,
  setProps: true,
  replaceProps: true
};

function extractPrototype(clazz) {
  var proto = {};
  for (var key in clazz.prototype) {
    if (ILLEGAL_KEYS[key] === undefined) {
      proto[key] = clazz.prototype[key];
    }
  }
  return proto;
}

export function createClass(clazz): any {
  var spec: any = extractPrototype(clazz);
  spec.displayName = clazz.prototype.constructor.name;
  if (spec.componentWillMount !== undefined) {
    var componentWillMount = spec.componentWillMount;
    spec.componentWillMount = function () {
      clazz.apply(this);
      componentWillMount.apply(this);
    };
  }
  else {
    spec.componentWillMount = function () {
      clazz.apply(this);
    };
  }

  return React.createClass(spec);
}