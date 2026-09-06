/* Move up and move down carry the item with its whole subtree. Among
 * siblings they swap places. At the first (or last) position the item
 * climbs out and joins the neighbouring parent: the parent's previous
 * sibling as its last child on the way up, the parent's next sibling as its
 * first child on the way down. A top-level item at the edge stays put and
 * the key is swallowed. Joining a folded parent unfolds it. With whole
 * items selected, the whole run moves together and stays selected. */
import type { ListItem, ListTree } from '../model';
import { childStep, relativeIndent, setIndent } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { keepSelection, selectedItems } from './selection';
import type { ItemSelection } from './selection';

function joinParent(tree: ListTree, sel: ItemSelection, parent: ListItem, index: number): void {
  const step = childStep(parent) ?? relativeIndent(sel.items[0] as ListItem);
  keepSelection(tree, sel, () => {
    sel.items.forEach((item, i) => {
      tree.detach(item);
      tree.attach(item, parent, index + i);
      setIndent(item, parent.indent + step);
    });
  });
  parent.folded = false;
}

export function moveUp(tree: ListTree): OpResult {
  const sel = selectedItems(tree);
  const first = sel?.items[0];
  if (!sel || !first) return PASS;
  const prev = tree.previousSibling(first);
  if (prev) {
    const at = tree.indexOf(prev);
    sel.items.forEach((item, i) => {
      tree.detach(item);
      tree.attach(item, prev.parent, at + i);
    });
  } else {
    const parent = first.parent;
    const target = parent ? tree.previousSibling(parent) : null;
    if (!target) return CONSUMED;
    joinParent(tree, sel, target, target.children.length);
  }
  renumber(tree);
  return UPDATED;
}

export function moveDown(tree: ListTree): OpResult {
  const sel = selectedItems(tree);
  const last = sel?.items[sel.items.length - 1];
  if (!sel || !last) return PASS;
  const next = tree.nextSibling(last);
  if (next) {
    for (const item of sel.items) tree.detach(item);
    sel.items.forEach((item, i) => tree.attach(item, next.parent, tree.indexOf(next) + 1 + i));
  } else {
    const parent = last.parent;
    const target = parent ? tree.nextSibling(parent) : null;
    if (!target) return CONSUMED;
    joinParent(tree, sel, target, 0);
  }
  renumber(tree);
  return UPDATED;
}
