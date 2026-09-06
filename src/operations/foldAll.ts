/* Expand all and collapse all work on the item under the cursor, or on
 * the selected items, and reach every level under them, where fold and
 * unfold reach one. Nothing in the text changes; the applicator brings
 * the editor's folds in line with the tree. After collapsing, a cursor
 * that stood on a line about to be hidden moves to the end of the item's
 * own line. */
import type { ListItem, ListTree } from '../model';
import { PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { selectedItems } from './selection';

function setFolds(item: ListItem, folded: boolean): void {
  if (item.hasChildren()) item.folded = folded;
  for (const child of item.children) setFolds(child, folded);
}

function foldAll(tree: ListTree, folded: boolean): OpResult {
  const sel = selectedItems(tree);
  if (!sel) return PASS;
  for (const item of sel.items) setFolds(item, folded);
  if (folded && !sel.whole) {
    const { item, lineIndex } = tree.selection.head;
    const root = sel.items[0] as ListItem;
    if (item !== root || lineIndex > 0) tree.setCursor(root, 0, root.lineText(0).length);
  }
  return UPDATED;
}

export function expandAll(tree: ListTree): OpResult {
  return foldAll(tree, false);
}

export function collapseAll(tree: ListTree): OpResult {
  return foldAll(tree, true);
}
