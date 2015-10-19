import React = require('react');
import TypedReact = require('TypedReact');

interface Props {
  children?: any;

  timeIntervalSec?: number; // частота проверки, в сек
  fitX?: boolean; // растягивание по оси x
  fitY?: boolean; // растягивание по оси y
}

interface State {
  width: number;
  height: number;
  children?: any;
}

// класс занимается растягиванием реактивных контролов по размеру не реактивного родителя,
// для этого он передаёт своим дочерним элементам width и height родителя

class FitToParentImpl extends TypedReact.Component<Props, State> {
  getDefaultProps() {
    return {
      timeIntervalSec: 0.5,
      fitX: true,
      fitY: true
    };
  }

  getInitialState() {
    return {};
  }

  doUpdateSize() {
    var parent: any = React.findDOMNode(this);
    if (!parent || !parent.parentElement)
      return;

    parent = parent.parentElement;

    if (parent.offsetWidth !== this.state.width || parent.offsetHeight !== this.state.height) {
      var children: any = [];
      var idx = 0;
      if (this.props.fitX || this.props.fitY) {
        React.Children.forEach(this.props.children, (child: React.ReactElement<any>) => {
          var newProps: any = {key: idx++};
          if (this.props.fitX)
            newProps.width = parent.offsetWidth;
          if (this.props.fitY)
            newProps.height = parent.offsetHeight;
          children.push(React.cloneElement(child, newProps));
        });
      } else {
        children = this.props.children;
      }

      this.setState({
        children: children,
        width: parent.offsetWidth,
        height: parent.offsetHeight
      });
    }
  }

  updateSizeByTime() {
    setTimeout(() => {
      this.doUpdateSize();

      if (this.isMounted())
        this.updateSizeByTime();

    }, this.props.timeIntervalSec * 1000);
  }

  componentDidMount() {
    this.doUpdateSize();
    this.updateSizeByTime();
  }

  render() {
    return <div style={{display:'inline-block'}}>{this.state.children}</div>;
  }
}

export var FitToParent = TypedReact.createClass(FitToParentImpl);
