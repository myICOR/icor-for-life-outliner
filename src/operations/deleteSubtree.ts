/* Delete the item with its subtree: the item and every descendant go, in
 * one change, wherever the cursor stands in the item. With whole items
 * selected, the whole run goes. The cursor lands at the content start of
 * the item that followed, or of the one before when nothing follows (the
 * folded item when that one is hidden). When nothing at all is left, an
 * empty item in the deleted item's shape stays, so the list survives its
 * last branch being cut. */
import { ListItem } from '../model';
import type { ListTree } from '../model';
import { renumber } from './renumber';
import { PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';
import { selectedItems } from './selection';

export function deleteWithSubtree(tree: ListTree, ctx: OpContext): OpResult {
  const sel = selectedItems(tree);
  const first = sel?.items[0];
  const last = sel?.items[sel.items.length - 1];
  if (!sel || !first || !last) return PASS;
  const after = tree.nextInOrder(last.lastDescendant());
  const before = tree.previousInOrder(first);
  for (const item of sel.items) tree.detach(item);

  let target: ListItem | null = after;
  if (!target && before) target = tree.outermostFoldedAncestor(before) ?? before;
  if (!target) {
    target = new ListItem(first.indent, first.bullet, first.bulletGap || ' ', null, '', ['']);
    tree.attach(target, null, 0);
  }
  tree.setCursor(target, 0, target.contentStart(ctx.mode));
  renumber(tree);
  return UPDATED;
}
