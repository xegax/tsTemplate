import {Point} from 'common/point';

export function normalize(vec: Point): Point {
  let len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
  return {
    x: vec.x / len,
    y: vec.y / len
  };
}

export function getPerpendicular(vec: Point): Point {
  return {
    x: -vec.y,
    y: vec.x
  };
}

export function getLineLen(from: Point, to: Point) {
  const x = from.x - to.x;
  const y = from.y - to.y;
  return Math.sqrt(x * x + y * y);
}

export function getPointProjection(from: Point, to: Point, point: Point): number {
  const x1 = from.x, y1 = from.y, x2 = to.x, y2 = to.y, x3 = point.x, y3 = point.y;
  const px = x2 - x1, py = y2 - y1, dAB = px * px + py * py;
  return ((x3 - x1) * px + (y3 - y1) * py) / dAB;
}

export function getDistanceOfLine(from: Point, to: Point, point: Point) {
  const t = getPointProjection(from, to, point);
  if (t < 0 || t > 1)
    return null;

  const xx = to.x - from.x;
  const yy = to.y - from.y;

  const proj = {
    x: from.x + xx * t,
    y: from.y + yy * t
  };

  return {
    point: proj,
    len: getLineLen(proj, point)
  };
}