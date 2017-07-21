import {SortColumn} from 'common/table';
import {FilterCondition} from 'table/filter-condition';

export interface TableParams {
  columns?: Array<string>;
  sort?: Array<SortColumn>;
  filter?: FilterCondition;
  distinct?: string;
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
  selectData(rows: Array<number>, cols?: Array<number>): Promise<any>;
  
  setParams(params?: TableParams): Promise<TableData>;
  createSubtable(params?: TableParams): Promise<TableData>;
  
  clearCache();

  getInfo(): TableInfo;
  getCell(row: number, col: number): TableCell;
  getParent(): TableData;
  getColumns(): TableData;
  remove();
}