/* Move up and move down carry the item with its whole subtree. Among
 * siblings they swap places. At the first (or last) position the item
 * climbs out and joins the neighbouring parent: the parent's previous
 * sibling as its last child on the way up, the parent's next sibling as its
 * first child on the way down. A top-level item at the edge stays put and
 * the key is swallowed. Joining a folded parent unfolds it. */
import type { ListItem, ListTree } from '../model';
import { childStep, keepSelectionOnText, relativeIndent, setIndent } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { selectedItem } from './selection';

function joinParent(tree: ListTree, item: ListItem, parent: ListItem, index: number): void {
  const step = childStep(parent) ?? relativeIndent(item);
  keepSelectionOnText(tree, () => {
    tree.detach(item);
    tree.attach(item, parent, index);
    setIndent(item, parent.indent + step);
  });
  parent.folded = false;
}

export function moveUp(tree: ListTree): OpResult {
  const item = selectedItem(tree);
  if (!item) return PASS;
  const prev = tree.previousSibling(item);
  if (prev) {
    const at = tree.indexOf(prev);
    tree.detach(item);
    tree.attach(item, prev.parent, at);
  } else {
    const parent = item.parent;
    const target = parent ? tree.previousSibling(parent) : null;
    if (!target) return CONSUMED;
    joinParent(tree, item, target, target.children.length);
  }
  renumber(tree);
  return UPDATED;
}

export function moveDown(tree: ListTree): OpResult {
  const item = selectedItem(tree);
  if (!item) return PASS;
  const next = tree.nextSibling(item);
  if (next) {
    tree.detach(item);
    tree.attach(item, next.parent, tree.indexOf(next) + 1);
  } else {
    const parent = item.parent;
    const target = parent ? tree.nextSibling(parent) : null;
    if (!target) return CONSUMED;
    joinParent(tree, item, target, 0);
  }
  renumber(tree);
  return UPDATED;
}
