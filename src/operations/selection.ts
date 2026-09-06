/* Which item does the selection address? One cursor, or one range that
 * starts and ends on the same item. Anything wider is not one item's
 * business and the operation passes. */
import type { ListItem, ListTree } from '../model';

export function selectedItem(tree: ListTree): ListItem | null {
  const { anchor, head } = tree.selection;
  if (!anchor) return null;
  return anchor.item === head.item ? head.item : null;
}
