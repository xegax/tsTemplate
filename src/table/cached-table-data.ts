import {TableData, TableCell, TableInfo, TableParams} from 'table/table-data';
import {clamp} from 'common/common';
import {CacheBlock, Block} from 'common/cache-block';
import {IThenable} from 'promise';

export {Block} from 'common/cache-block';

export interface TableRange {
  rows: Array<number>;
  cols: Array<number>;
}

function clampRange(range: TableRange, rows: number, cols: number) {
  if (!range.cols)
    range.cols = [0, cols - 1];

  if (rows == 0) {
    range.rows = [];
  } else {
    range.rows[0] = clamp(range.rows[0], [0, rows - 1]);
    range.rows[1] = clamp(range.rows[1], [0, rows - 1]);
  }
  
  if (cols == 0) {
    range.cols = [];
  } else {
    range.cols[0] = clamp(range.cols[0], [0, cols - 1]);
    range.cols[1] = clamp(range.cols[1], [0, cols - 1]);
  }
}

export function fillCache(block: Block, range: TableRange, data: (absRow, absCol, relRow, relCol) => TableCell) {
  for (let r = 0; r < block.cache.length; r++)
    for (let c = 0; c < block.cache[r].length; c++)
      block.cache[r][c] = data(range.rows[0] + r, range.cols[0] + c, r, c);
}

export class CachedTableData implements TableData {
  private cache: CacheBlock;

  protected rowsNum: number = 0;
  protected colsNum: number = 0;
  protected requestNum: number = 0;

  protected columns: TableData;
  
  constructor(rowsNum: number, colsNum: number) {
    this.rowsNum = rowsNum;
    this.colsNum = colsNum;

    this.cache = new CacheBlock({totalRows: rowsNum, totalCols: colsNum});
  }

  selectData(rows: Array<number>, cols?: Array<number>): Promise<any> {
    const range = {rows, cols: cols || [0, this.colsNum - 1]};
    clampRange(range, this.rowsNum, this.colsNum);

    const loadPromises = [];
    const blockRange = this.cache.toBlockRange({rows: range.rows, cols: range.cols});
    for (let blockRow = blockRange.blockRows[0]; blockRow <= blockRange.blockRows[1]; blockRow++) {
      for (let blockCol = blockRange.blockCols[0]; blockCol <= blockRange.blockCols[1]; blockCol++) {
        if (this.cache.getCacheBlock({blockRow, blockCol}))
          continue;
        
        let block = this.cache.createCacheBlock({blockRow, blockCol});
        let range = this.cache.toDataRange({blockRow, blockCol});
        this.initCache(block, range);

        loadPromises.push(new Promise((resolve => {
          this.requestNum++;
          console.log('request', this.requestNum);
          this.loadCacheRange(block, range).then(() => {
            this.requestNum--;
            console.log('request', this.requestNum);
            resolve({});
          });
        })));
      }
    }

    if (this.columns) {
      if (this.columns instanceof CachedTableData) {
        let columns = this.columns as CachedTableData;
        const br = columns.cache.toBlockRange({rows: range.cols, cols: [0, 0]});
        for (let r = br.blockRows[0]; r <= br.blockRows[1]; r++) {
          if (!columns.cache.getCacheBlock({blockRow: r, blockCol: 0})) {
            loadPromises.push(columns.selectData(range.cols, [0, 0]));
            break;
          }
        }
      } else { 
        loadPromises.push(this.columns.selectData(range.cols, [0, 0]));
      }
    }

    if (loadPromises.length == 0)
      return new Promise((resolve) => {
        setTimeout(resolve, 1);
      });

    return Promise.all(loadPromises);
  }

  protected initCache(block: Block, range: TableRange) {
    const rows = range.rows.length == 0 ? 0 : (range.rows[1] - range.rows[0]) + 1;
    const cols = range.cols.length == 0 ? 0 : (range.cols[1] - range.cols[0]) + 1;
    block.cache = Array<Array<TableCell>>(rows);
    for (let r = 0; r < rows; r++) {
      block.cache[r] = Array<TableCell>(cols);
      for (let c = 0; c < cols; c++) {
        block.cache[r][c] = {text: '?', raw: null};
      }
    }
  }

  protected loadCacheRange(block: Block, range: TableRange): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        fillCache(block, range, (row, col) => ({text: [row, col].join(':'), raw: null}));
        resolve({});
      }, 1);
    });
  }

  createSubtable(params?: TableParams): Promise<TableData> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), 1);
    });
  }

  setParams(params?: TableParams): Promise<TableData> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), 1);
    });
  }

  clearCache() {
    this.cache.clear();
  }

  getInfo(): TableInfo {
    return {rowNum: this.rowsNum, colNum: this.colsNum};
  }

  getCell(row: number, col: number): TableCell {
    let block = this.cache.toBlock(row, col);
    let data = this.cache.getCacheBlock(block);
    if (!data)
      return {text: '?', raw: null};

    let blockRange = this.cache.toDataRange(block);
    row -= blockRange.rows[0];
    col -= blockRange.cols[0];
    
    if (row >= data.cache.length || col >= data.cache[row].length)
      return {text: '?', raw: null};

    return data.cache[row][col];
  }

  getParent(): TableData {
    return null;
  }

  getColumns(): TableData {
    return this.columns;
  }

  remove() {
  }
}