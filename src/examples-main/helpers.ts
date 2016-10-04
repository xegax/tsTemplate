export function createContainer(width?: number, height?: number): HTMLDivElement {
  let cont = document.createElement('div');
  if (width !== undefined)
    cont.style.width = width + 'px';
  if (height !== undefined)
    cont.style.height = height + 'px';
  getContainer().appendChild(cont);
  return cont;
}

export function getContainer() {
  return document.getElementById('container');
}