import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridRender, Cell} from 'controls/grid/grid-render';
import {ScrollbarPanel} from 'controls/scrollbar-panel';
import {startDragging} from 'common/start-dragging';
import {GridModel, GridModelEvent, GridModelBase} from 'controls/grid/grid-model';

interface ChangeEvent {
  columns: Array<number>;
  rows: Array<number>;
  scrollLeft: number;
  scrollTop: number;
}

interface Props {
  width?: number;
  height?: number;

  vScroll?: boolean;
  hScroll?: boolean;

  model: GridModel;
  header?: GridModel;

  aligned?: boolean;
  resizable?: boolean;

  renderHeader?(column: number): Cell;
  renderCell?(column: number, row: number): Cell;
  
  style?: React.CSSProperties;
}

interface State {
  clientWidth?: number;
  clientHeight?: number;
  scrollLeft?: number;
  scrollTop?: number;
  columns?: Array<number>;
  columnsSize?: number;
  header?: GridModel;
}

const classes = {
  control: 'grid_control',
  header: 'grid_control--header',
  body: 'grid_control--body',
  resizeHandle: 'grid_control--header--resize_handle'
}; 

export class GridControl extends React.Component<Props, State> {
  private map: GridRender;

  static defaultProps: Props = {
    vScroll: true,
    hScroll: true,

    width: 0,
    height: 0,
    model: new GridModelBase(),
    header: null,

    aligned: false,
    resizable: false,

    renderHeader: (column: number) => ({ element: '' + column }),
    renderCell: (column: number, row: number) => ({ element: [column, row].join(':') })
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      scrollLeft: 0,
      scrollTop: 0
    };
    
    if (!props.header) {
      let header = this.state.header = new GridModelBase();
      header.setColumns(props.model.getColumns());
      header.setRows(1);
    }
    props.model.addSubscriber(this.onModelChanged);
  }

  onModelChanged = (eventMask) => {
    if (eventMask & GridModelEvent.COLUMNS) {
      this.state.header.setColumns(this.props.model.getColumns());
      this.state.header.notifySubscribers();
    }
    this.forceUpdate();
  }

  componentWillUnmount() {
    this.props.model.removeSubscriber(this.onModelChanged);
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.model != this.props.model) {
      this.props.model.removeSubscriber(this.onModelChanged);
      newProps.model.addSubscriber(this.onModelChanged);
    }
  }

  private onScrolling = (event) => {
    let {scrollLeft, scrollTop} = event;
    
    let body = this.props.model;
    let header = this.state.header;

    body.setScrollLeft(scrollLeft);
    body.setScrollTop(scrollTop);
    body.notifySubscribers();

    header.setScrollLeft(scrollLeft);
    header.notifySubscribers();
  };

  private onClientSize = (event) => {
    let {width, height} = event;
    this.setState({clientWidth: width, clientHeight: height});
    this.state.header.setWidth(width);
    this.props.model.setWidth(width);
    this.props.model.setHeight(height);
  };

  getMouseRelativeTo(target: Element, event: React.MouseEvent) {
    let rect = target.getBoundingClientRect();
    return {x: event.pageX - rect.left, y: event.pageY - rect.top};
  }

  private renderHeader() {
    const {clientWidth} = this.state;
    let cellHeight = this.state.header.getCellHeight();
    return (
      <GridRender
        className = {classes.header}
        width = {clientWidth}
        height = {cellHeight}
        model = {this.state.header}
        renderCell = {this.props.renderHeader}
      />
    );
  }

  private renderBody() {
    const {
      renderCell
    } = this.props;
    
    const {
      clientWidth, clientHeight
    } = this.state;

    return (
      <GridRender
        className = {classes.body}
        ref = {e => this.map = e}

        width = {clientWidth}
        height = {clientHeight}

        model = {this.props.model}

        renderCell = {renderCell}
      />
    );
  }

  render() {
    let cellHeight = this.props.model.getCellHeight();
    let rows = this.props.model.getRows();

    const {
      width, height,
      renderHeader,
      aligned,
      vScroll,
      hScroll
    } = this.props;
    
    const {
      clientWidth, clientHeight,
      scrollLeft, scrollTop
    } = this.state;

    let contentWidth = this.props.model.getSummOfSizes();
    let contentHeight = cellHeight * (rows + (aligned ? 1 : 0));

    return (
      <div className={classes.control} style={this.props.style}>
        {this.renderHeader()}
        <ScrollbarPanel
          width={width}
          height={height - cellHeight}

          contentWidth={contentWidth}
          contentHeight={contentHeight}

          onScrolling = {this.onScrolling}
          onClientSize = {this.onClientSize}

          vScrollStep={aligned ? cellHeight : 10}
          hScrollStep={10}

          vScroll={vScroll}
          hScroll={hScroll}
        >
          {this.renderBody()}
        </ScrollbarPanel>
      </div>
    );
  }
}