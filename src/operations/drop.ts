/* A drop: the dragged item with its subtree lands before a target item,
 * after it (after the target's whole subtree, as its next sibling), or as
 * the target's first child. One detach, one attach, the indent taken from
 * where it lands. A target inside the dragged subtree is refused. The
 * cursor goes to the moved item's content. */
import type { ListItem, ListTree } from '../model';
import { setIndent, stepFor } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, UPDATED } from './result';
import type { OpContext, OpResult } from './result';

export type DropPlace = 'before' | 'after' | 'child';

function inside(item: ListItem, root: ListItem): boolean {
  for (let p: ListItem | null = item; p; p = p.parent) if (p === root) return true;
  return false;
}

export function dropItem(tree: ListTree, item: ListItem, target: ListItem, place: DropPlace, ctx: OpContext): OpResult {
  if (inside(target, item)) return CONSUMED;
  const asChild = place === 'child';
  /* The step is read before the item moves in, or the item would be the
     target's first child and would answer for itself. */
  const childIndent = target.indent + stepFor(tree, target, item);
  tree.detach(item);
  if (asChild) {
    tree.attach(item, target, 0);
    setIndent(item, childIndent);
    target.folded = false;
  } else {
    tree.attach(item, target.parent, tree.indexOf(target) + (place === 'after' ? 1 : 0));
    setIndent(item, target.indent);
  }
  renumber(tree);
  tree.setCursor(item, 0, item.contentStart(ctx.mode));
  return UPDATED;
}
