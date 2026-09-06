/* Tab. The item and everything under it move under the previous sibling,
 * as its last child. With no previous sibling there is nowhere to go: the
 * key is swallowed and nothing moves, so Tab never inserts a tab character
 * into a list. A folded target is unfolded, or the item would vanish. */
import type { ListTree } from '../model';
import { keepSelectionOnText, setIndent, stepFor } from './indentation';
import { renumber } from './renumber';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { selectedItem } from './selection';

export function indent(tree: ListTree): OpResult {
  const item = selectedItem(tree);
  if (!item) return PASS;
  const target = tree.previousSibling(item);
  if (!target) return CONSUMED;
  const newIndent = target.indent + stepFor(tree, target, item);
  keepSelectionOnText(tree, () => {
    tree.detach(item);
    tree.attach(item, target, target.children.length);
    setIndent(item, newIndent);
  });
  target.folded = false;
  renumber(tree);
  return UPDATED;
}
