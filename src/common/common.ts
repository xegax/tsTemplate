export function className(...args: Array<string | boolean>): string {
  return args.filter(name => typeof name == 'string').map(name => name).join(' ');
}

export function clamp(value: number, minMax: Array<number>) {
  return Math.min(Math.max(value, minMax[0]), minMax[1]);
}

export function parsePath(path: string): {path: string, name: string} {
  let splitPos = path.lastIndexOf('/');
  if (splitPos != -1) {
    return {
      path: path.substr(0, splitPos + 1),
      name: path.substr(splitPos + 1)
    };
  }
  
  return {
    path: '',
    name: path
  };
}

export const enum Align {
  Left,
  Middle,
  Right
}

let touchDevice: boolean;
export function isTouchDevice() {
  if (touchDevice != null)
    return touchDevice;
  try {
    document.createEvent('TouchEvent');
    touchDevice = true;
  } catch (e) {
    touchDevice = false;
  }
}

export function join(arr: Array<any>, separator: any): Array<any> {
  let res = [];
  arr.forEach((item, idx) => {
    if (idx != arr.length - 1)
      res.push(item, separator);
    else
      res.push(item);
  });
  return res;
}