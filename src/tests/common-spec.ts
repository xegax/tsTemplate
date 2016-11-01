import {clamp} from 'common/common';

describe('common.ts unit tests', () => {
  it('clamp', () => {
    expect(clamp(10, [0, 100])).toBe(10);
    expect(clamp(-10, [0, 100])).toBe(0);
    expect(clamp(110, [0, 100])).toBe(100);
  });
});