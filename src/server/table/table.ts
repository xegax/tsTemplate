import {
  SortColumn,
  SortDir
} from '../../common/table';
import {
  FilterCondition,
  CompoundCondition,
  ColumnCondition,
  ConditionCat,
  ConditionText
} from '../../table/filter-condition';
import {MySQLTableImpl} from './mysql-table';
import {SQLiteTableImpl} from './sqlite3-table';
import {PGTableImpl} from './pg-table';

export type Row = Array<number | string>;
export interface TableParams {
  filter?: FilterCondition;
  sorting?: Array<SortColumn>;
  distinct?: string;
}

export interface Table {
  getParent(): Table;
  setParams(params: TableParams): Promise<any>;
  getSubtable(params: TableParams): Promise<Table>;
  getData(start?: number, count?: number, columnsArr?: Array<string>): Promise<Array<Row>>;
  getRows(): number;
  getColumns(): Array<Array<string>>;
  getName(): string;
}

const factory = {
  'sqlite': (table: string) => new SQLiteTableImpl(table),
  'mysql': (table: string) => new MySQLTableImpl(table),
  'pg': (table: string) => new PGTableImpl(table)
};

export function getTableMaker(type: string): (table: string) => Table {
  if (!factory[type])
    throw `table type=[${type}] is not implemented`;
  return factory[type];
}