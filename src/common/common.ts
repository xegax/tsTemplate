export function className(...args: Array<string | boolean>): string {
  return args.filter(name => typeof name == 'string').map(name => name).join(' ');
}