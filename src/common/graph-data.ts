import {Point} from 'common/point';
import {
  getDistanceOfLine,
  getLineLen,
  normalize
} from 'common/math';

export interface Link {
  from: number;
  to: number;
}

export class GraphData {
  private points = Array<Point>();
  private links = Array<Link>();
  private linkedPoints = Array<Array<number>>();

  constructor(points: Array<Point>, links: Array<Link>) {
    this.points = points;
    this.links = links;
    this.linkedPoints = this.makeLinkedPoints();
  }

  private makeLinkedPoints(): Array<Array<number>> {
    const points: Array<Array<number>> = this.points.map(pt => []);
    this.links.forEach(link => {
      if (points[link.from].indexOf(link.to) == -1)
        points[link.from].push(link.to);
  
      if (points[link.to].indexOf(link.from) == -1)
        points[link.to].push(link.from);
    });

    return points;
  }

  findPath(startPoint: number, endPoint: number) {
    if (startPoint == endPoint)
      return [startPoint];

    const linkedPoints = this.linkedPoints;
    let level = 0;
    const pointsMap = this.points.map(i => -1);
    pointsMap[startPoint] = level;

    const iteration = () => {
      let moves = 0;
      for (let pointIdx = 0; pointIdx < pointsMap.length; pointIdx++) {
        const pointLevel = pointsMap[pointIdx];
        if (pointLevel != level)
          continue;

        const links = linkedPoints[pointIdx];
        for (let i = 0; i < links.length; i++) {
          const ptIdx = links[i];
          if (ptIdx == endPoint)
            return moveBackward(ptIdx, level);

          if (pointsMap[ptIdx] == -1) {
            pointsMap[ptIdx] = level + 1;
            moves++;
          }
        }
      }
      level++;

      if (moves == 0)
        throw 'path not found'
      return null;
    };

    let finalPath = Array<number>();
    const moveBackward = (start: number, level: number) => {
      if (level == 0)
        return finalPath.reverse();

      const links = linkedPoints[start];
      for (let i = 0; i < links.length; i++) {
        const ptIdx = links[i];
        if (pointsMap[ptIdx] == level) {
          finalPath.push(ptIdx);
          return moveBackward(ptIdx, level - 1);
        }
      }

      throw 'something wrong';
    };

    try {
      while(true) {
        const path = iteration();
        if (path == null)
          continue;

        return [startPoint, ...path, endPoint];
      }
    } catch (e) {
      return [];  // path not found
    }
  }

  findClosestLine(point: Point) {
    let pt: Point;
    let len: number;
    let linkIdx: number = -1;

    this.links.forEach((link, n) => {
      const from = this.points[link.from];
      const to = this.points[link.to];
      const res = getDistanceOfLine(from, to, point);
      if (res && (linkIdx == -1 || res.len < len)) {
        len = res.len;
        pt = res.point;
        linkIdx = n;
      }

      [from, to].forEach(linePoint => {
        const l = getLineLen(linePoint, point);
        if (l < len || linkIdx == -1) {
          linkIdx = n;
          len = l;
          pt = linePoint;
        }
      });
    });

    if (!pt)
      return null;

    return {
      point: pt,
      link: linkIdx
    };
  }

  getClosestPointIdx(pos: Point): number {
    const res = this.findClosestLine(pos);
    const l1 = getLineLen(this.points[this.links[res.link].from], res.point);
    const l2 = getLineLen(this.points[this.links[res.link].to], res.point);
    return l1 < l2 ? this.links[res.link].from : this.links[res.link].to;
  }

  isLinkPoints(p1Idx: number, p2Idx: number, linkIdx: number): boolean {
    const {from, to} = this.links[linkIdx];
    return (p1Idx == from && p2Idx == to) || (p1Idx == to && p2Idx == from);
  }

  getClampPoint(point: Point) {
    point = {...point};
    const res = this.findClosestLine(point);

    if (!res)
      return point;

    const len = getLineLen(res.point, point);
    if (len > 30) {
      let vec = normalize({x: point.x - res.point.x, y: point.y - res.point.y});
      point.x = res.point.x + vec.x * 30;
      point.y = res.point.y + vec.y * 30;
    }

    return point;
  }

  buildPath(start: Point, end: Point): Array<Point> {
    end = this.getClampPoint(end);

    const line = this.findClosestLine(start);
    const tgtLine = this.findClosestLine(end);
    
    if (tgtLine && line.link == tgtLine.link) {
      return [{...end}];
    }

    let targets = this.findPath(this.getClosestPointIdx(start), this.getClosestPointIdx(end));
    if (targets.length > 1 && this.isLinkPoints(targets[0], targets[1], line.link))
      targets = targets.slice(1);

    if (targets.length > 1 && this.isLinkPoints(targets[targets.length - 1], targets[targets.length - 2], tgtLine.link))
      targets.pop();

    const path: Array<Point> = targets.map((n, i) => {
      return {...this.points[n]};
    });
    path.push({...end});

    return path;
  }
}
