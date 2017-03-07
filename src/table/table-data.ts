import {SortColumn} from 'common/table';
import {IThenable} from 'promise';
import {FilterCondition} from 'table/filter-condition';

export interface SubtableParams {
  columns?: Array<string>;
  sort?: Array<SortColumn>;
  filter?: FilterCondition;
  type?: 'distinct';
}

export interface TableCell {
  raw: any;
  text: string;
}

export interface TableInfo {
  rowNum: number;
  colNum: number;
}

export interface TableData {
  selectData(rows: Array<number>, cols?: Array<number>): IThenable<any>;
  getSubtable(params?: SubtableParams): IThenable<TableData>;
  clearCache();

  getInfo(): TableInfo;
  getCell(row: number, col: number): TableCell;
  getParent(): TableData;
  getColumns(): TableData;
  remove();
}