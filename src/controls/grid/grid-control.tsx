import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {GridRender, Cell} from 'controls/grid/grid-render';
import {ScrollbarPanel} from 'controls/scrollbar/scrollbar-panel';
import {startDragging} from 'common/start-dragging';
import {GridModel, GridModelEvent, GridModelFeatures} from 'controls/grid/grid-model';
import {assign} from 'lodash';
import {className, clamp} from 'common/common';

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

  header?: boolean;
  model: GridModel;

  resizable?: boolean;
  focus?: boolean;

  renderHeader?(column: number): Cell;
  renderCell?(column: number, row: number): Cell;

  style?: React.CSSProperties;
  className?: string;
}

interface State {
  clientWidth?: number;
  clientHeight?: number;
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
    model: new GridModel(),
    header: true,
    resizable: false,

    renderHeader: (column: number) => ({ element: '' + column }),
    renderCell: (column: number, row: number) => ({ element: [column, row].join(':') })
  };

  constructor(props: Props) {
    super(props);
    let state: State = {};

    if (props.header) {
      let header = state.header = new GridModel();
      header.setColumns(props.model.getColumns());
      header.setRows(1);
    }
    props.model.addSubscriber(this.onModelChanged);
    this.state = state;
  }

  onModelChanged = (eventMask) => {
    if (this.props.header && eventMask & GridModelEvent.COLUMNS) {
      this.state.header.setColumns(this.props.model.getColumns());
      this.state.header.notifySubscribers();
    }
    this.forceUpdate();
  }

  componentDidMount() {
    if (this.props.focus) {
      let node = ReactDOM.findDOMNode<HTMLElement>(this.map);
      node.focus();
    }
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

    header && header.setScrollLeft(scrollLeft);
    header && header.notifySubscribers();
  };

  private onClientSize = (event) => {
    let {width, height} = event;
    this.setState({clientWidth: width, clientHeight: height});
    this.state.header && this.state.header.setWidth(width);
    this.props.model.setWidth(width);
    this.props.model.setHeight(height);
  };

  getMouseRelativeTo(target: Element, event: React.MouseEvent<HTMLElement>) {
    let rect = target.getBoundingClientRect();
    return {x: event.pageX - rect.left, y: event.pageY - rect.top};
  }

  private onResizeColumn(column: number, event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
    const feature = GridModelFeatures.ROWS_HIGHLIGHTABLE;
    const highlightable = this.props.model.hasFeatures(feature);
    let size = this.props.model.getColumnSize(column);
    startDragging({x: size, y: 0}, {
      onDragStart: () => {
        this.props.model.setFeatures(feature, false);
        this.props.model.startColumnResizing(column);
      },
      onDragging: e => {
        this.props.model.setColumnSize(column, clamp(e.x, [2, this.props.width]));
      },
      onDragEnd: () => {
        this.props.model.setFeatures(feature, highlightable);
        this.props.model.endColumnResizing();
      }
    })(event as any as MouseEvent);
  }

  private renderHeaderCell = (column: number) => {
    if (this.props.resizable == false)
      return this.props.renderHeader(column);

    let cell = assign({}, this.props.renderHeader(column));
    let resizer = (
      <div
        className={classes.resizeHandle}
        onTouchStart={e => this.onResizeColumn(column, e)}
        onMouseDown={e => this.onResizeColumn(column, e)}
      />
    );
    cell.element = <div style={{height: '100%'}}>{cell.element}{resizer}</div>;
    return cell;
  }

  private renderHeader() {
    const {clientWidth} = this.state;
    let cellHeight = this.state.header.getCellHeight();

    return (
      <div style={{background: 'white'}}>
        <GridRender
          className = {classes.header}
          width = {clientWidth}
          height = {cellHeight}
          model = {this.state.header}
          renderCell = {this.renderHeaderCell}
        />
      </div>
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
    const headerCellHeight = this.state.header ? this.state.header.getCellHeight() : 0;
    let cellHeight = this.props.model.getCellHeight();
    let rows = this.props.model.getRows();

    let {
      width, height,
      vScroll,
      hScroll,
      header
    } = this.props;

    
    const aligned = this.props.model.hasFeatures(GridModelFeatures.ROWS_ALIGNED);
    const contentWidth = this.props.model.getSummOfSizes();
    let contentFullHeight = cellHeight * rows;
    
    const panelHeight = (header == false) ? height : height - headerCellHeight;
    if (contentFullHeight <= panelHeight)
      vScroll = false;

    if (aligned && panelHeight % cellHeight != 0)
      contentFullHeight += cellHeight;

    return (
      <div className={className(classes.control, this.props.className)} style={assign({width, height}, this.props.style)}>
        {header ? this.renderHeader(): null}
        <ScrollbarPanel
          width={width}
          height={panelHeight}

          contentWidth={contentWidth}
          contentHeight={contentFullHeight}

          onScrolling = {this.onScrolling}
          onClientSize = {this.onClientSize}

          vScrollStep={aligned ? cellHeight : 10}
          hScrollStep={10}

          vScroll={vScroll}
          hScroll={hScroll}

          scrollLeft={this.props.model.getScrollLeft()}
          scrollTop={this.props.model.getScrollTop()}
        >
          {this.renderBody()}
        </ScrollbarPanel>
      </div>
    );
  }
}
