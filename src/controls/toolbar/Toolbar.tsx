import React = require('react');
import TypedReact = require('TypedReact');
import Tool = require('controls/toolbar/tool');
import {BoxSizer} from 'controls/sizer/boxsizer';

var CSS_TOOLBAR = 'toolbar';

interface Property {
    children?: any;  
    padding?: number;
    width?: number;
    height?: number;
}

interface State {
  width?: number;
  height?: number;
}

class ToolbarComponent extends TypedReact.Component<Property, State> {
  getInitialState() {
    return {};
  }
  
  getDefaultProps() {
    return {
      height: 30,
      padding: 2
    };
  }
  
  getSize() {
    var size = {
      width: this.state.width,
      height: this.state.height
    };
    if (size.width == undefined)
      size.width = this.props.width;
    if (size.height == undefined)
      size.height = this.props.height;
      
    size.width -= this.props.padding * 2;
    size.height -= this.props.padding * 2;
    
    return size;
  }
  
  getChildren() {
    var padding = this.props.padding;
    var size = this.getSize();
    var width = size.width - padding * 2;
    var height = size.height - padding * 2;
    var idx = 0;
    return React.Children.map(this.props.children, (child: React.ReactElement<any>) => {
      var newProps: any = { key: idx++};
      
      if (Tool.isTool(child)) {
        newProps.width = height + padding * 2;
        newProps.height = height + padding * 2;
        newProps.sizer = {prop: 0};
      }
      
      return React.cloneElement(child, newProps);
    });
  }
  
  render() {
    var size = this.getSize();
    var style = {
      width: size.width + this.props.padding * 2,
      height: size.height + this.props.padding * 2,
      padding: this.props.padding
    };
    
    return (
      <div style={style} className={CSS_TOOLBAR}>
        <BoxSizer width={size.width} height={size.height} padding={4}>
          {this.getChildren()}
        </BoxSizer>
      </div>
    );
  }
}

export var Toolbar = TypedReact.createClass(ToolbarComponent);