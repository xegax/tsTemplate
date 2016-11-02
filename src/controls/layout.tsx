import * as React from 'react';
import {Align, className} from 'common/common';

interface RowGroupProps {
  children?: React.ReactElement<any>;
  grow?: boolean;
  align?: Align;
  margin?: number;  // margin between group items
}

const classes = {
  rowGroup: 'row-group',
  itemWrapper: 'row-group__item-wrapper',
  rowGroupGrow: 'row-group__grow',
  left: 'row-group__left',
  right: 'row-group__right',
  middle: 'row-group__middle',

  columnGroup: 'column-group',
  columnGroupGrow: 'column-group__grow',
  columnItemWrapper: 'column-group__item-wrapper'
};

export function RowGroup(props: RowGroupProps) {
  let align: string;
  if (props.align == Align.Left) {
    align = classes.left;
  } else if (props.align == Align.Right) {
    align = classes.right;
  } else if (props.align == Align.Middle) {
    align = classes.middle;
  }

  const margin = props.margin == null ? 10 : props.margin;
  const style = {
    marginRight: margin
  };

  const count = React.Children.count(props.children);
  return (
    <div className={className(classes.rowGroup, align, props.grow && classes.rowGroupGrow)}>
      {React.Children.map(props.children, (child, n) => {
        return <div style={(n < count - 1) ? style : {}} className={classes.itemWrapper}>{child}</div>;
      })}
    </div>
  );
}

interface ColumnGroupProps {
  children?: React.ReactElement<any>;
  grow?: boolean;
  align?: Align;
  margin?: number;  // margin between group items
}

export function ColumnGroup(props: ColumnGroupProps) {
  const margin = props.margin == null ? 10 : props.margin;
  const style = {
    marginBottom: margin
  };

  const count = React.Children.count(props.children);
  return (
    <div className={className(classes.columnGroup, props.grow && classes.columnGroupGrow)}>
      {React.Children.map(props.children, (child, n) => {
        return <div style={(n < count - 1) ? style : {}} className={classes.columnItemWrapper}>{child}</div>;
      })}
    </div>
  );
}