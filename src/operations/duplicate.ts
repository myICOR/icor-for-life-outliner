/* Duplicate the item with its subtree: a copy of the item and everything
 * under it, notes lines and folds included, lands right after the
 * original at the same indent, and the cursor goes to the start of the
 * copy's content. With whole items selected, the run is copied after
 * itself and the copies are selected, ready for Tab or a move. Ordered
 * lists count again. */
import { ListItem } from '../model';
import type { ListTree } from '../model';
import { renumber } from './renumber';
import { PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';
import { selectedItems, setWholeItemSelection } from './selection';

export function cloneItem(item: ListItem): ListItem {
  const copy = new ListItem(item.indent, item.bullet, item.bulletGap, item.checkbox, item.checkboxGap, [...item.lines]);
  copy.folded = item.folded;
  for (const child of item.children) {
    const c = cloneItem(child);
    c.parent = copy;
    copy.children.push(c);
  }
  return copy;
}

export function duplicate(tree: ListTree, ctx: OpContext): OpResult {
  const sel = selectedItems(tree);
  const last = sel?.items[sel.items.length - 1];
  if (!sel || !last) return PASS;
  const copies = sel.items.map(cloneItem);
  const at = tree.indexOf(last) + 1;
  copies.forEach((copy, i) => tree.attach(copy, last.parent, at + i));
  const firstCopy = copies[0] as ListItem;
  const lastCopy = copies[copies.length - 1] as ListItem;
  if (sel.whole) setWholeItemSelection(tree, firstCopy, lastCopy);
  else tree.setCursor(firstCopy, 0, firstCopy.contentStart(ctx.mode));
  renumber(tree);
  return UPDATED;
}
