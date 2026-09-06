/* Shift-Tab. The item and everything under it leave the parent and land
 * right after it, as the parent's next sibling. Siblings that followed the
 * item stay with the parent. At the top level there is nowhere to go and
 * the key is swallowed. With whole items selected, every selected item
 * leaves, in order, as one change. */
import type { ListTree } from '../model';
import { setIndent } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { keepSelection, selectedItem, selectedItems } from './selection';

export function outdent(tree: ListTree): OpResult {
  const sel = selectedItems(tree);
  const first = sel?.items[0];
  if (!sel || !first) return PASS;
  const parent = first.parent;
  if (!parent) return CONSUMED;
  keepSelection(tree, sel, () => {
    sel.items.forEach((item, i) => {
      tree.detach(item);
      tree.attach(item, parent.parent, tree.indexOf(parent) + 1 + i);
      setIndent(item, parent.indent);
    });
  });
  renumber(tree);
  return UPDATED;
}

/* Enter on an empty nested item outdents it instead of adding another
 * empty item below. Anything else passes to the Enter behaviour proper. */
export function outdentIfEmpty(tree: ListTree): OpResult {
  const item = selectedItem(tree);
  if (!item || !tree.hasSingleCursor()) return PASS;
  if (!item.isEmpty() || item.hasChildren() || !item.parent) return PASS;
  return outdent(tree);
}
