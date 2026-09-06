/* Toggle done. An item without a task box gets `[x]`; `[ ]` becomes `[x]`
 * and any other state becomes `[ ]`. The cursor keeps its character,
 * wherever it stood in the item, and the item's children are not
 * touched. With whole items selected, every selected item is toggled on
 * its own. */
import type { ListItem, ListTree } from '../model';
import { PASS, UPDATED } from './result';
import type { OpResult } from './result';
import { keepSelection, selectedItems } from './selection';

export function toggleBox(item: ListItem): void {
  if (item.checkbox === null) {
    item.bulletGap = item.bulletGap || ' ';
    item.checkbox = '[x]';
    item.checkboxGap = (item.lines[0] ?? '') === '' ? '' : ' ';
    return;
  }
  item.checkbox = item.checkbox === '[ ]' ? '[x]' : '[ ]';
}

export function toggleDone(tree: ListTree): OpResult {
  const sel = selectedItems(tree);
  if (!sel) return PASS;
  keepSelection(tree, sel, () => {
    for (const item of sel.items) toggleBox(item);
  });
  return UPDATED;
}
