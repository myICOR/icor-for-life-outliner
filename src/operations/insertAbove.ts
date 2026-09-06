/* Mod-Shift-Enter. An empty sibling appears right above the item, at the
 * same indent and with the same bullet, and the cursor goes into it; the
 * item itself is not touched, wherever the cursor stood in it. A task box
 * is carried over unchecked, the way Enter does it, so a task list stays
 * a task list. Ordered lists count again. A selection passes to the
 * editor. */
import { ListItem } from '../model';
import type { ListTree } from '../model';
import { renumber } from './renumber';
import { PASS, UPDATED } from './result';
import type { OpResult } from './result';

export function insertAbove(tree: ListTree): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const item = tree.selection.head.item;
  const box = item.checkbox ? '[ ]' : null;
  const created = new ListItem(item.indent, item.bullet, item.bulletGap || ' ', box, box ? ' ' : '', ['']);
  tree.attach(created, item.parent, tree.indexOf(item));
  tree.setCursor(created, 0, created.contentStart('bullet-and-checkbox'));
  renumber(tree);
  return UPDATED;
}
