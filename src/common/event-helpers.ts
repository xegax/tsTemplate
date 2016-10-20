export function isLeftDown(event: MouseEvent) {
  var evt: any = event;

  if (evt.button !== undefined)
    return evt.button === 0;

  return evt.buttons === 1;
}