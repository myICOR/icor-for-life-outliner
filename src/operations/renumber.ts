/* Ordered lists count again after every structural change. Each run of
 * numbered siblings counts from 1; a dash in between starts a new run.
 * Unordered items are untouched. Counting from 1 rather than from whatever
 * the first item carried is deliberate: after a move or an indent that
 * number is an accident of where the item came from. */
import { orderedBullet } from '../model';
import type { ListItem, ListTree } from '../model';

function renumberSiblings(list: ListItem[]): void {
  let counter: number | null = null;
  for (const item of list) {
    const ordered = orderedBullet(item.bullet);
    if (!ordered) {
      counter = null;
    } else {
      counter = counter === null ? 1 : counter + 1;
      item.bullet = `${counter}${ordered.close}`;
    }
    renumberSiblings(item.children);
  }
}

export function renumber(tree: ListTree): void {
  renumberSiblings(tree.items);
}
