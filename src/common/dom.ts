export function findParentNode(node: HTMLElement, tgt: HTMLElement): boolean {
  while(node) {
    node = node.parentElement;
    if (node == tgt)
      return true;
  }

  return false;
}