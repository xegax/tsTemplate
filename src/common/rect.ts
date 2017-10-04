import {Point} from './point';

export {Point};

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoundRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function getRect(x?: number, y?: number, width?: number, height?: number): Rect {
  return {
    x: x || 0,
    y: y || 0,
    width: width || 0,
    height: height || 0
  };
}

export function isPointInRect(pt: Point, rect: Rect) {
  return pt.x >= rect.x && pt.y >= rect.y && pt.x <= rect.x + rect.width && pt.y <= rect.y + rect.height;
}