/* Which items does the selection address?
 *
 * Three shapes are recognised. A cursor, or a range inside one item,
 * addresses that item. A WHOLE-ITEM selection runs from column zero of one
 * item's bullet line to the end of the last line of a sibling's subtree
 * (either way round) and addresses every sibling in between, each with its
 * subtree; Shift-Up and Shift-Down build these. Anything else (a range
 * that starts or ends mid-item, or reaches across levels) is not one
 * operation's business and the operation passes. */
import { comparePositions } from '../model';
import type { ListItem, ListTree, Loc } from '../model';
import { keepSelectionOnText } from './indentation';

export interface WholeItemRange {
  /* Siblings in document order, first to last. */
  items: ListItem[];
  /* The end the selection grows from and the end that moves. */
  anchorItem: ListItem;
  headItem: ListItem;
}

export type ItemSelection = { items: ListItem[]; whole: false } | ({ whole: true } & WholeItemRange);

function atItemStart(loc: Loc): boolean {
  return loc.lineIndex === 0 && loc.ch === 0;
}

function atLastLineEnd(loc: Loc): boolean {
  const last = loc.item.lines.length - 1;
  return loc.lineIndex === last && loc.ch === loc.item.lineText(last).length;
}

/* The whole-item selection, or null when the selection is not one. */
export function wholeItemRange(tree: ListTree): WholeItemRange | null {
  const { anchor, head } = tree.selection;
  if (!anchor) return null;
  const order = comparePositions(tree.absolute(anchor), tree.absolute(head));
  if (order === 0) return null;
  const from = order < 0 ? anchor : head;
  const to = order < 0 ? head : anchor;
  if (!atItemStart(from) || !atLastLineEnd(to)) return null;
  const first = from.item;
  /* The last selected sibling is the ancestor of `to`'s item that shares
     the first item's parent, and `to` must close its whole subtree. */
  let last: ListItem | null = to.item;
  while (last && last.parent !== first.parent) last = last.parent;
  if (!last || last.lastDescendant() !== to.item) return null;
  const siblings = tree.siblingsOf(first);
  const a = siblings.indexOf(first);
  const b = siblings.indexOf(last);
  if (b < a) return null;
  const items = siblings.slice(a, b + 1);
  return order < 0 ? { items, anchorItem: first, headItem: last } : { items, anchorItem: last, headItem: first };
}

export function selectedItems(tree: ListTree): ItemSelection | null {
  const whole = wholeItemRange(tree);
  if (whole) return { whole: true, ...whole };
  const { anchor, head } = tree.selection;
  if (!anchor) return null;
  return anchor.item === head.item ? { items: [head.item], whole: false } : null;
}

/* The single item a one-item operation works on, or null. */
export function selectedItem(tree: ListTree): ListItem | null {
  const sel = selectedItems(tree);
  return sel && sel.items.length === 1 ? (sel.items[0] ?? null) : null;
}

/* Select `anchorItem` through `headItem` (siblings, either order) as whole
 * items: column zero of the earlier one to the end of the later one's
 * subtree, with the anchor on the anchor item's side. */
export function setWholeItemSelection(tree: ListTree, anchorItem: ListItem, headItem: ListItem): void {
  const forward = tree.indexOf(anchorItem) <= tree.indexOf(headItem);
  const first = forward ? anchorItem : headItem;
  const last = forward ? headItem : anchorItem;
  const leaf = last.lastDescendant();
  const lastIndex = leaf.lines.length - 1;
  const start: Loc = { item: first, lineIndex: 0, ch: 0 };
  const end: Loc = { item: leaf, lineIndex: lastIndex, ch: leaf.lineText(lastIndex).length };
  tree.setSelection(forward ? start : end, forward ? end : start);
}

/* Run `mutate` and keep the selection meaningful afterwards: a whole-item
 * selection is pinned back onto the same items wherever they went, and a
 * cursor or in-item range stays on its characters. */
export function keepSelection(tree: ListTree, sel: ItemSelection, mutate: () => void): void {
  if (sel.whole) {
    mutate();
    setWholeItemSelection(tree, sel.anchorItem, sel.headItem);
  } else {
    keepSelectionOnText(tree, mutate);
  }
}
