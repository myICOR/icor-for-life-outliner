/* Tab. The item and everything under it move under the previous sibling,
 * as its last child. With no previous sibling there is nowhere to go: the
 * key is swallowed and nothing moves, so Tab never inserts a tab character
 * into a list. A folded target is unfolded, or the item would vanish.
 * With whole items selected, every selected item goes, in order, as one
 * change. */
import type { ListTree } from '../model';
import { setIndent, stepFor } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { keepSelection, selectedItems } from './selection';

export function indent(tree: ListTree): OpResult {
  const sel = selectedItems(tree);
  const first = sel?.items[0];
  if (!sel || !first) return PASS;
  const target = tree.previousSibling(first);
  if (!target) return CONSUMED;
  const newIndent = target.indent + stepFor(tree, target, first);
  keepSelection(tree, sel, () => {
    for (const item of sel.items) {
      tree.detach(item);
      tree.attach(item, target, target.children.length);
      setIndent(item, newIndent);
    }
  });
  target.folded = false;
  renumber(tree);
  return UPDATED;
}
