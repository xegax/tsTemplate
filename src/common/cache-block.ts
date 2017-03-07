import {assign} from 'lodash';
import {clamp} from 'common/common';

interface Config {
  totalRows: number;
  totalCols: number;

  rowsPerBlock?: number;
  colsPerBlock?: number;
}

export interface Block {
  cache: Array<Array<any>>;
}

interface BlockCell {
  blockRow: number;
  blockCol: number;
}

interface DataRange {
  rows: Array<number>;
  cols: Array<number>;
}

interface BlockRange {
  blockRows: Array<number>;
  blockCols: Array<number>;
}

export class CacheBlock {
  private params: Config;
  private blocks = Array<Array<Block>>();

  constructor(params: Config) {
    this.params = assign({rowsPerBlock: 300, colsPerBlock: 100}, params);
  }

  toBlock(row: number, col: number): BlockCell {
    row = Math.floor(row / this.params.rowsPerBlock);
    col = Math.floor(col / this.params.colsPerBlock);

    return {blockRow: row, blockCol: col};
  }

  toBlockRange(range: DataRange): BlockRange {
    if (range.rows.length == 0 || range.cols.length == 0) {
      return {
        blockRows: [],
        blockCols: []
      };
    }

    const min = this.toBlock(range.rows[0], range.cols[0]);
    const max = this.toBlock(range.rows[1], range.cols[1]);
    return {
      blockRows: [min.blockRow, max.blockRow],
      blockCols: [min.blockCol, max.blockCol]
    };
  }

  toDataRange(block: BlockCell): DataRange {
    const range = {
      rows: [
        block.blockRow * this.params.rowsPerBlock,
        block.blockRow * this.params.rowsPerBlock + this.params.rowsPerBlock - 1
      ],
      cols: [
        block.blockCol * this.params.colsPerBlock,
        block.blockCol * this.params.colsPerBlock + this.params.colsPerBlock - 1
      ]
    };

    range.rows[1] = clamp(range.rows[1], [0, this.params.totalRows - 1]);
    range.cols[1] = clamp(range.cols[1], [0, this.params.totalCols - 1]);
    return range;
  }

  getCacheBlock(block: BlockCell): Block {
    if (block.blockRow >= this.blocks.length)
      return null;
    
    if (!this.blocks[block.blockRow] || block.blockCol >= this.blocks[block.blockRow].length)
      return null;
    
    return this.blocks[block.blockRow][block.blockCol];
  }

  createCacheBlock(block: BlockCell): Block {
    if (!this.blocks[block.blockRow])
      this.blocks[block.blockRow] = [];
    this.blocks[block.blockRow][block.blockCol] = {cache: []};
    return this.getCacheBlock(block);
  }

  clear() {
    this.blocks = [];
  }
}