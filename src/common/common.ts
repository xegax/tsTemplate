export function className(...args: Array<string | boolean>): string {
  return args.filter(name => typeof name == 'string').map(name => name).join(' ');
}

export function clamp(value: number, minMax: Array<number>) {
  return Math.min(Math.max(value, minMax[0]), minMax[1]);
}