import {Point, Size} from 'common/point';
import {Rect, BoundRect, getRect} from 'common/rect';
import {clamp} from 'common/common';

export interface PointItem {
  center: Point;  // масштабируемая точка
  relRect: Rect;  // немасштабируемые границы точки
}

function addPoints(pts: Array<Point>, rect: BoundRect): BoundRect {
  const newRect = {...rect};

  pts.forEach(pt => {
    newRect.left = Math.min(pt.x, newRect.left);
    newRect.top = Math.min(pt.y, newRect.top);
    newRect.right = Math.max(pt.x, newRect.right);
    newRect.bottom = Math.max(pt.y, newRect.bottom);
  });

  return newRect;
}

function getRectFromBound(rect: BoundRect): Rect {
  return {
    x: rect.left,
    y: rect.top,
    width: (rect.right - rect.left) + 1,
    height: (rect.bottom - rect.top) + 1
  };
}

export function getItemRect(item: PointItem): Rect {
  return {
    x: item.center.x + item.relRect.x,
    y: item.center.y + item.relRect.y,
    width: item.relRect.width,
    height: item.relRect.height
  };
}

export interface Bounds {
  bbox: Rect;     // scalable bounds (Item.point bounds), minX = bbox.x, minY = bbox.y
  relRect: Rect;  // fixed bounds, -relRect.x = left size, relRect.x + relRect.width = right size
}

export function searchBounds(arr: Array<PointItem>): Bounds {
  const bounds: Bounds = {
    bbox: {x: 0, y: 0, width: 0, height: 0},
    relRect: {x: 0, y: 0, width: 0, height: 0}
  };

  let bbox: BoundRect;
  let bbox2: BoundRect;
  arr.forEach(item => {
    const rect = getItemRect(item);
    if (bbox == null) {
      bbox = {left: rect.x, top: rect.y, right: rect.x + rect.width - 1, bottom: rect.y + rect.height - 1};
      bbox2 = {left: item.center.x, top: item.center.y, right: item.center.x, bottom: item.center.y};
    } else {
      bbox = addPoints([
        {x: rect.x, y: rect.y},
        {x: rect.x + rect.width - 1, y: rect.y + rect.height - 1}
      ], bbox);

      bbox2 = addPoints([item.center], bbox2);
    }
  });

  bounds.bbox = getRectFromBound(bbox2);
  bounds.relRect = getRectFromBound(bbox);
  bounds.relRect.x = bounds.relRect.x - bounds.bbox.x;
  bounds.relRect.y = bounds.relRect.y - bounds.bbox.y;

  return bounds;
}

export function makeQuad(center: Point, size: number): PointItem {
  const halfSize = Math.ceil(size / 2);
  return {
    center,
    relRect: {
      x: -halfSize,
      y: -halfSize,
      width: size,
      height: size
    }
  };
}

export interface Transform {
  setPoints(arr: Array<PointItem>);

  setScale(scale: number);
  getScale(): number;

  get(item: PointItem): PointItem;  // data point => screen point
  getRect(item: PointItem): Rect;

  getInvert(pt: Point): Point;      // screen point => data point

  getSize(): Size;
}

class TransformImpl implements Transform {
  private scale: number = 1;
  private points = Array<PointItem>();

  private bounds: Bounds = {
    bbox: {x: 0, y: 0, width: 0, height: 0},
    relRect: {x: 0, y: 0, width: 0, height: 0}
  };

  setPoints(arr: Array<PointItem>) {
    this.points = arr.slice();
    this.bounds = searchBounds(arr);

    if (this.scale != 1)
      this.updateRelRect();

    return this;
  }

  private updateRelRect() {
    const bounds = searchBounds(this.points.map(point => this.get(point)));
    this.bounds.relRect = {
      x: bounds.relRect.x,
      y: bounds.relRect.y,
      width: bounds.relRect.width - bounds.bbox.width + this.bounds.bbox.width,
      height: bounds.relRect.height - bounds.bbox.height + this.bounds.bbox.height
    };
  }

  setScale(scale: number) {
    this.scale = scale;
    this.updateRelRect();
  }

  getScale(): number {
    return this.scale;
  }

  get(point: PointItem): PointItem {
    const center = {
      x: Math.ceil((point.center.x - this.bounds.bbox.x) * this.scale + Math.abs(this.bounds.relRect.x)),
      y: Math.ceil((point.center.y - this.bounds.bbox.y) * this.scale + Math.abs(this.bounds.relRect.y))
    };

    return {center, relRect: {...point.relRect}};
  }

  getInvert(pt: Point): Point {
    return {
      x: (pt.x - Math.abs(this.bounds.relRect.x)) / this.scale + this.bounds.bbox.x,
      y: (pt.y - Math.abs(this.bounds.relRect.y)) / this.scale + this.bounds.bbox.y
    };
  }

  getRect(item: PointItem): Rect {
    return getItemRect(this.get(item));
  }

  getSize(): Size {
    return {
      width: Math.ceil((this.bounds.bbox.width - 1) * this.scale + 1) + this.bounds.relRect.width - this.bounds.bbox.width,
      height: Math.ceil((this.bounds.bbox.height - 1) * this.scale + 1) + this.bounds.relRect.height - this.bounds.bbox.height
    };
  }
}

export interface RectView extends Transform {
  setViewPoint(x: number, y: number);
  setViewSize(width: number, height: number);

  scrollToPoint(x: number, y: number);

  getViewRect(): Rect;
  getTransform(): Transform;
}

export class RectViewImpl implements RectView {
  private impl: Transform;
  private padding = 10;
  private view: Rect = {x: 0, y: 0, width: 0, height: 0};

  constructor(impl: Transform) {
    this.impl = impl;
  }

  getTransform() {
    return this.impl;
  }

  setPoints(arr: Array<PointItem>) {
    this.impl.setPoints(arr);
    this.setViewPoint(this.view.x,  this.view.y);
  }
  
  setScale(scale: number) {
    this.impl.setScale(scale);
    this.setViewPoint(this.view.x, this.view.y);
  }

  getScale(): number {
    return this.impl.getScale();
  }
  
  get(item: PointItem): PointItem {
    const res = this.impl.get(item);
    res.center.x -= this.view.x;
    res.center.y -= this.view.y;
    return res;
  }

  getRect(item: PointItem): Rect {
    const res = this.impl.getRect(item);
    res.x -= this.view.x;
    res.y -= this.view.y;
    return res;
  }

  getInvert(pt: Point): Point {
    return this.impl.getInvert({x: pt.x + this.view.x, y: pt.y + this.view.y});
  }
  
  getSize(): Size {
    return this.impl.getSize();
  }

  setViewPoint(x: number, y: number) {
    const size = this.impl.getSize();

    const minX = -this.padding;
    const maxX = size.width - this.view.width + this.padding;

    const minY = -this.padding;
    const maxY = size.height - this.view.height + this.padding;

    if (size.width < this.view.width) {
      this.view.x = Math.ceil(size.width / 2 - this.view.width / 2);
    } else {
      this.view.x = clamp(x, [minX, maxX]);
    }

    if (size.height < this.view.height) {
      this.view.y = Math.ceil(size.height / 2 - this.view.height / 2);
    } else {
      this.view.y = clamp(y, [minY, maxY]);
    }
  }

  scrollToPoint(x: number, y: number) {
    const size = this.impl.getSize();
    
    const minX = -Math.max(this.view.width, this.padding);
    const maxX = size.width;
    
    const minY = -Math.max(this.view.height, this.padding);
    const maxY = size.height;
    
    this.view.x = clamp(x, [minX, maxX]);
    this.view.y = clamp(y, [minY, maxY]);
  }

  setViewSize(width: number, height: number) {
    this.view.width = width;
    this.view.height = height;
  }

  getViewRect(): Rect {
    return {...this.view};
  }
}

export function createTransform(arr: Array<PointItem>): RectView {
  const tr = new TransformImpl().setPoints(arr);
  return new RectViewImpl(tr);
}
