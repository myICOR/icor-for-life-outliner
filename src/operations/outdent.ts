/* Shift-Tab. The item and everything under it leave the parent and land
 * right after it, as the parent's next sibling. Siblings that followed the
 * item stay with the parent. At the top level there is nowhere to go and
 * the key is swallowed. */
import type { ListTree } from '../model';
import { keepSelectionOnText, setIndent } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { selectedItem } from './selection';

export function outdent(tree: ListTree): OpResult {
  const item = selectedItem(tree);
  if (!item) return PASS;
  const parent = item.parent;
  if (!parent) return CONSUMED;
  keepSelectionOnText(tree, () => {
    tree.detach(item);
    tree.attach(item, parent.parent, tree.indexOf(parent) + 1);
    setIndent(item, parent.indent);
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
