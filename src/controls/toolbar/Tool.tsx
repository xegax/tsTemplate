import React = require('react');
import TypedReact = require('TypedReact');

var CSS_TOOL = 'tool';
var CSS_BUTTON = 'button';
var CSS_CHECKED = 'checked';
var CSS_CHECKBOX = 'checkbox';
var CSS_ICON = 'icon';
var CSS_SEPARATOR = 'separator';
var CSS_CONTAINER = 'container';

export interface Property {
  title?: string;
  className?: string;
  icon?: string;
  id?: string;
  enabled?: boolean;
  onClick?: (button) => void;
  width?: number;
  height?: number;
  toolSize?: number;
  
  checked?: boolean;
}

interface State {
  checked?: boolean;
}

class ButtonComponent extends TypedReact.Component<Property, State> {
  getInitialState() {
    return {
    };
  }
  
  getDefaultProps() {
    return {
      width: 28,
      height: 28,
      className: CSS_TOOL + ' ' + CSS_BUTTON
    };
  }

  getClassName() {
    var className = this.props.className;
    if(this.props.enabled === false)
      className+=' disabled';
    return className;
  }

  render() {
    var title = this.props.title;
    var className = this.getClassName();
    var icon = this.props.icon;
    var toolSize = this.props.toolSize || this.props.height;
    return (
      <div
      style={{width: toolSize, height: toolSize}}
        onClick={this.onClick}
        className={className}
        title={title}>
          {(icon)?<div className={CSS_ICON + ' ' + icon} style={{width: toolSize - 2, height: toolSize - 2}}></div>:null}
      </div>
    );
  }

  onClick(event) {
    var onClick = this.props.onClick;
    if(onClick && this.props.enabled!==false)
      onClick(this);
  }
}

class CheckBoxComponent extends ButtonComponent {
    getInitialState() {
      return {
        className: CSS_TOOL + ' ' + CSS_CHECKBOX,
        checked: this.props.checked
      };
    }

    getClassName() {
      var className = super.getClassName();
      return (this.state.checked)?className + ' ' + CSS_CHECKED : className;
    }

    onClick(event: MouseEvent) {
      if(this.props.enabled === false)
        return; 

      this.setState({ checked: !this.state.checked});
      super.onClick(event);
    }
}

class SeparatorComponent extends TypedReact.Component<Property, State> {
    getDefaultProps() {
      return {
        width: 4,
        sizer: {prop: 0}
      };
    }
    
    render() {
      var className = CSS_TOOL + ' ' + CSS_SEPARATOR;
      return (
        <div
          className={className}>
        </div>);
    }
}

interface LabelProps {
  sizer?: any;
  style?: any;
  width?: number;
  height?: number;
  children?: any;
}

class LabelComponent extends TypedReact.Component<LabelProps, {}> {
  render() {
    var style: any = this.props.style || {};
    style.width = this.props.width;
    style.height = this.props.height;
    style.lineHeight = this.props.height + 'px';
    
    return (<div style={style}>
        {this.props.children}
      </div>);
  }
}

interface TextBoxProps {
  sizer?: any;
  style?: any;
  width?: number;
  height?: number;
  value?: string;
  onEnter?: (text: string) => void;
}

interface TextBoxState {
  value?: string;
}

class TextBoxComponent extends TypedReact.Component<TextBoxProps, TextBoxState> {
  getDefaultProps() {
    return {
      value: ''
    };
  }
  
  getInitialState() {
    return {
      value: this.props.value
    };
  }
  
  componentWillReceiveProps(newProps: TextBoxProps) {
    this.setState({value: newProps.value});
  }
  
  onEnter() {
    return (event) => {
      if (event.keyCode == 13)
        this.props.onEnter && this.props.onEnter(this.state.value);
    };
  }
  
  onChange(event) {
    this.setState({value: event.target.value});
  }
  
  render() {
    var style: any = this.props.style || {};
    style.width = this.props.width;
    style.height = this.props.height;
    
    return (<input
        className='textbox'
        type={'text'}
        style={style}
        onChange={this.onChange}
        onKeyDown={this.onEnter()}
        value={this.state.value}
        />);
  }
}

export var Button = TypedReact.createClass(ButtonComponent);
export var CheckBox = TypedReact.createClass(CheckBoxComponent);
export var Separator = TypedReact.createClass(SeparatorComponent);
export var Label = TypedReact.createClass(LabelComponent);
export var TextBox = TypedReact.createClass(TextBoxComponent);

export function IconButton(props: Property) {
  return (<Button {...props}/>);
}

export function isTool(comp: React.ReactElement<any>) {
  if (!comp.props || !comp.props.className)
    return false;
  return comp.props.className.indexOf(CSS_TOOL) != -1;
}