/* Tree to lines. The inverse of the parser: every line the parser read comes
 * back byte for byte, because the tree keeps indentation, gaps and notes
 * lines verbatim and adds nothing of its own. */
import type { ListItem, ListTree } from './tree';

export function printItem(item: ListItem, out: string[]): void {
  out.push(item.prefix() + (item.lines[0] ?? ''));
  for (let i = 1; i < item.lines.length; i++) out.push(item.lines[i] ?? '');
  for (const child of item.children) printItem(child, out);
}

export function printTree(tree: ListTree): string[] {
  const out: string[] = [];
  for (const item of tree.items) printItem(item, out);
  return out;
}
