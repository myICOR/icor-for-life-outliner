/* Shift-Down and Shift-Up select whole items. From a cursor, Shift-Down
 * selects the item with its subtree and the next sibling with its subtree,
 * column zero of the first to the end of the last; Shift-Up selects the
 * item and the previous sibling. From a whole-item selection, the head
 * end moves one sibling further, or one sibling back, so the selection
 * grows and shrinks the way a text selection does, sibling by sibling. At
 * the first or last sibling there is nowhere to go and the key is
 * swallowed. A cursor with no sibling on that side selects the item alone.
 * A range that is not whole items passes to the editor. */
import type { ListTree } from '../model';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { setWholeItemSelection, wholeItemRange } from './selection';

function extend(tree: ListTree, direction: -1 | 1): OpResult {
  const range = wholeItemRange(tree);
  if (range) {
    const next = direction > 0 ? tree.nextSibling(range.headItem) : tree.previousSibling(range.headItem);
    if (!next) return CONSUMED;
    setWholeItemSelection(tree, range.anchorItem, next);
    return UPDATED;
  }
  if (!tree.hasSingleCursor()) return PASS;
  const item = tree.selection.head.item;
  const next = direction > 0 ? tree.nextSibling(item) : tree.previousSibling(item);
  setWholeItemSelection(tree, item, next ?? item);
  return UPDATED;
}

export function selectDown(tree: ListTree): OpResult {
  return extend(tree, 1);
}

export function selectUp(tree: ListTree): OpResult {
  return extend(tree, -1);
}
