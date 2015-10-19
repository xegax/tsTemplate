import React = require('react');
import TypedReact = require('TypedReact');

interface State {
  width?: number;
  height?: number;
}

interface Props {
  orientation?: Orientation;

  width?: number;
  height?: number;

  border?: number;
  padding?: number;

  toolSize?: number;

  style?: any;
  children?: React.ReactElement<any>[];
}

var CSS_BOX_SIZER = 'box-sizer';
var CSS_BOX_SIZER_CONTAINER = 'box-sizer-container';

export enum Orientation {
  HORIZONTAL,
  VERTICAL
}

class BoxSizerComponent extends TypedReact.Component<Props, State> {
  getDefaultProps() {
    return {
      orientation: Orientation.HORIZONTAL
    };
  }

  getSize() {
    return [
      this.props.width,
      this.props.height
    ];
  }

  getChildSize(child: React.ReactElement<any>) {
    if (this.props.orientation === Orientation.HORIZONTAL)
      return child.props.width;
    return child.props.height;
  }

  getResizedChildren() {
    var children = this.props.children;
    if (!children)
      return;

    var childCount = 0;
    React.Children.forEach(this.props.children, (child: React.ReactElement<any>) => {
      childCount++;
    });

    var padding = this.props.padding || 0;
    var border = this.props.border || 0;
    var sizeIdx = this.props.orientation;

    var horizontal = this.props.orientation === Orientation.HORIZONTAL;

    var undefPropItems = 0;
    var propSumm = 0;
    var freeSize = this.getSize()[sizeIdx] - border * 2 - padding * (childCount - 1);

    var self = this;
    var childSizes = [];
    React.Children.forEach(this.props.children, function(child: React.ReactElement<any>) {
      var prop = Helper.getProportion(child.props);

      if (prop !== undefined) {
        propSumm += prop;
      } else {
        undefPropItems++;
      }

      if (propSumm > 1)
        throw 'summ of all child proportion must be less than 1';

      var childSize = self.getChildSize(child);
      if (prop === 0 && childSize !== undefined) {
        freeSize -= childSize;
        childCount--;
      }
      childSizes.push({child: child, prop: prop});
    });

    if (undefPropItems)
      childSizes.forEach(function(item) {
        if (item.prop === undefined)
          item.prop = (1 - propSumm) / undefPropItems;
      });

    var pos = border;
    var sz = this.getSize();

    return childSizes.map(( item, idx) => {
      var child = item.child;
      var prop = item.prop;
      var childSize = self.getChildSize( child );
      var resize = (prop !== 0);
      if (resize) {
        childSize = freeSize * prop;
        childSize = Math.min(childSize, childSize);
      }

      var style: any = {};
      var width = sz[0] - border * 2;
      var height = sz[1] - border * 2;
      if (horizontal) {
        style.left = pos + 'px';
        style.top = border + 'px';
        style.width = childSize + 'px';
        style.height = height;
        width = childSize;
      } else {
        style.left = border + 'px';
        style.top = pos + 'px';
        style.width = width;
        style.height = childSize + 'px';
        height = childSize;
      }
      pos += childSize + padding;

      var clone =  React.cloneElement(child, {width: width, height: height});
      return (<div className={CSS_BOX_SIZER} key={idx} style={style}>{clone}</div>);
    });
  }

  render() {
    var children = this.getResizedChildren();
    var style = {
      width: this.props.width,
      height: this.props.height
    };

    return (
    <div className = {CSS_BOX_SIZER_CONTAINER}
      style = {style}>
      {children}
    </div>);
  }
}

class Helper {
  static getProportion(props: any) {
    if (props.sizer)
      return props.sizer.prop;
  }
}

export var BoxSizer = TypedReact.createClass(BoxSizerComponent);
