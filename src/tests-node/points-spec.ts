import {Point} from 'common/point';
import { Rect, BoundRect } from 'common/rect';
import {searchBounds, createTransform} from '../examples/points-view';

describe('points', () => {
  describe('searchBounds', () => {
    it('1 item', () => {
      const items = [
        {
          center: {x: 10, y: 5},
          relRect: {x: 0, y: 0, width: 3, height: 3}
        }
      ];
      expect(searchBounds(items))
        .toEqual({
          bbox: {x: 10, y: 5, width: 1, height: 1},
          relRect: {x: 0, y: 0, width: 3, height: 3}
        });
    });

    it('2 item', () => {
      const items = [
        {
          center: {x: 15, y: 7},
          relRect: {x: 0, y: 0, width: 5, height: 1}
        }, {
          center: {x: 10, y: 5},
          relRect: {x: 0, y: 0, width: 3, height: 3}
        }
      ];
      expect(searchBounds(items))
        .toEqual({
          bbox: {x: 10, y: 5, width: 6, height: 3},
          relRect: {x: 0, y: 0, width: 10, height: 3}
        });
    });

    it('2 item - fixed', () => {
      const items = [
        {
          center: {x: 5, y: 5},
          relRect: {x: -2, y: -2, width: 5, height: 5}
        }, {
          center: {x: 9, y: 9},
          relRect: {x: -2, y: -2, width: 5, height: 5}
        }
      ];
      expect(searchBounds(items))
        .toEqual({
          bbox: {x: 5, y: 5, width: 5, height: 5},
          relRect: {x: -2, y: -2, width: 9, height: 9}
        });
    });

    it('4 item', () => {
      const items = [
        {
          center: {x: 4, y: 2},
          relRect: {x: -2, y: -2, width: 2, height: 2}
        }, {
          center: {x: 7, y: 3},
          relRect: {x: 0, y: 0, width: 5, height: 1}
        }, {
          center: {x: 5, y: 5},
          relRect: {x: -5, y: 0, width: 5, height: 2}
        }, {
          center: {x: 8, y: 6},
          relRect: {x: 0, y: 0, width: 2, height: 2}
        }
      ];
      expect(searchBounds(items))
        .toEqual({
          bbox: {x: 4, y: 2, width: 5, height: 5},
          relRect: {x: -4, y: -2, width: 12, height: 8}
        });
    });

    it('scaling', () => {
      const items = [
        {
          center: {x: 4, y: 0},
          relRect: {x: 0, y: 0, width: 1, height: 1}
        }, {
          center: {x: 9, y: 0},
          relRect: {x: 0, y: 0, width: 1, height: 1}
        }
      ];

      const tr = createTransform(items);
      expect(tr.getSize()).toEqual({width: 5 + 1, height: 1});

      tr.setScale(10);
      expect(tr.getSize()).toEqual({width: 50 + 1, height: 1});
    });
  });
});
