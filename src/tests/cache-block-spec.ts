import {CacheBlock} from 'common/cache-block';

describe('CacheBlock', () => {
  it('create and get block', () => {
    let cacheBlock = new CacheBlock({totalRows: 100000, totalCols: 100});
    expect(cacheBlock.getCacheBlock({blockRow: 0, blockCol: 0})).toBeNull();

    let block = cacheBlock.createCacheBlock({blockRow: 0, blockCol: 0});
    expect(block).toEqual({cache: []});

    block.cache[0] = [1, 2, 3, 4];
    expect(cacheBlock.getCacheBlock({blockRow: 0, blockCol: 0})).toEqual({cache: [[1, 2, 3, 4]]});
    expect(cacheBlock.toBlockRange({rows: [0, 99999], cols: [0, 99]})).toEqual({blockRows: [0, 333], blockCols: [0, 0]});
  });

  it('small block size', () => {
    let cache = new CacheBlock({totalRows: 5, totalCols: 5});
    for (let r = 0; r < 5; r++)
      for(let c = 0; c < 5; c++)
        expect(cache.toBlock(r, c)).toEqual({blockRow: 0, blockCol: 0});
    expect(cache.toDataRange({blockRow: 0, blockCol: 0})).toEqual({rows: [0, 4], cols: [0, 4]});
    expect(cache.toBlockRange({rows: [0, 4], cols: [0, 4]})).toEqual({blockRows: [0, 0], blockCols: [0, 0]});
  });

  it('blocks storing', () => {
    let cache = new CacheBlock({totalRows: 10000, totalCols: 3000});
    let block1 = cache.createCacheBlock({blockRow: 0, blockCol: 0});
    block1.cache = [['0:0']];
    let block2 = cache.createCacheBlock({blockRow: 0, blockCol: 1});
    block2.cache = [['0:1']];
    let block3 = cache.createCacheBlock({blockRow: 1, blockCol: 0});
    block3.cache = [['1:0']];
    let block4 = cache.createCacheBlock({blockRow: 1, blockCol: 1});
    block4.cache = [['1:1']];
    
    expect(cache.getCacheBlock({blockRow: 1, blockCol: 1})).toBe(block4);
    expect(cache.getCacheBlock({blockRow: 0, blockCol: 0})).toBe(block1);
    expect(cache.getCacheBlock({blockRow: 0, blockCol: 1})).toBe(block2);
    expect(cache.getCacheBlock({blockRow: 1, blockCol: 0})).toBe(block3);
  });
});