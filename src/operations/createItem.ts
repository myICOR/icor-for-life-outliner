/* Enter. The line splits at the cursor and the tail becomes a new item.
 *
 * Where the new item goes:
 *   - the item has children that are not folded and the cursor is at the
 *     very end of the item: the new item is the FIRST CHILD, shaped like
 *     the existing first child (indent and bullet);
 *   - otherwise: the new item is the NEXT SIBLING, and unfolded children
 *     follow the new item (they belong to the tail, not to the head);
 *   - folded children stay where they are, and the new item lands after
 *     the whole folded subtree.
 *
 * A task box is carried over, always unchecked. Notes lines after the
 * cursor travel to the new item. Ordered lists count again.
 *
 * Enter passes to the editor when the cursor sits before the content (in
 * the bullet or the box), when the item is an empty top-level item without
 * children (the editor's Enter removes the bullet, which is what an empty
 * root bullet wants), and when there is a selection rather than a cursor. */
import { ListItem, leadingWhitespace } from '../model';
import type { ListTree } from '../model';
import { renumber } from './renumber';
import { PASS, UPDATED } from './result';
import type { OpResult } from './result';

export function createItem(tree: ListTree): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const { item, lineIndex, ch } = tree.selection.head;
  const line = item.lines[lineIndex] ?? '';
  const start = lineIndex === 0 ? item.prefix().length : leadingWhitespace(line).length;
  if (ch < start) return PASS;
  if (!item.parent && item.isEmpty() && !item.hasChildren()) return PASS;

  const cut = lineIndex === 0 ? ch - item.prefix().length : ch;
  const head = line.slice(0, cut);
  const tail = line.slice(cut);
  const atEnd = lineIndex === item.lines.length - 1 && tail === '';
  const trailing = item.lines.splice(lineIndex + 1);
  item.lines[lineIndex] = head;

  const box = item.checkbox ? '[ ]' : null;
  const boxGap = item.checkbox ? item.checkboxGap || ' ' : '';
  const first = item.children[0];
  const asChild = first !== undefined && !item.folded && atEnd;
  const shape = asChild ? first : item;
  const created = new ListItem(shape.indent, shape.bullet, shape.bulletGap || ' ', box, boxGap, [tail, ...trailing]);

  if (asChild) {
    tree.attach(created, item, 0);
  } else {
    tree.attach(created, item.parent, tree.indexOf(item) + 1);
    if (!item.folded) {
      while (item.children.length > 0) {
        const child = item.children[0] as ListItem;
        tree.detach(child);
        tree.attach(child, created, created.children.length);
      }
    }
  }
  tree.setCursor(created, 0, created.contentStart('bullet-and-checkbox'));
  renumber(tree);
  return UPDATED;
}
