/* Mod-A climbs: the item's own content, then the item with its subtree,
 * then the whole list. From the whole list, or from a selection that
 * already reaches outside the list, the editor's select-all runs. */
import { comparePositions } from '../model';
import type { ListTree, Loc } from '../model';
import { PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';

interface Rung {
  from: Loc;
  to: Loc;
}

function contains(tree: ListTree, rung: Rung, from: Loc, to: Loc): boolean {
  return comparePositions(tree.absolute(rung.from), tree.absolute(from)) <= 0 && comparePositions(tree.absolute(to), tree.absolute(rung.to)) <= 0;
}

function equals(tree: ListTree, rung: Rung, from: Loc, to: Loc): boolean {
  return comparePositions(tree.absolute(rung.from), tree.absolute(from)) === 0 && comparePositions(tree.absolute(rung.to), tree.absolute(to)) === 0;
}

export function selectAll(tree: ListTree, ctx: OpContext): OpResult {
  const { anchor, head } = tree.selection;
  if (!anchor) return PASS;
  const ordered = comparePositions(tree.absolute(anchor), tree.absolute(head)) <= 0;
  const from = ordered ? anchor : head;
  const to = ordered ? head : anchor;

  const item = head.item;
  const lastIndex = item.lines.length - 1;
  const lastOfSubtree = item.lastDescendant();
  const all = tree.itemsInOrder();
  const firstItem = all[0] as typeof item;
  const lastItem = all[all.length - 1] as typeof item;
  const rungs: Rung[] = [
    { from: { item, lineIndex: 0, ch: item.contentStart(ctx.mode) }, to: { item, lineIndex: lastIndex, ch: item.lineText(lastIndex).length } },
    { from: { item, lineIndex: 0, ch: item.contentStart(ctx.mode) }, to: { item: lastOfSubtree, lineIndex: lastOfSubtree.lines.length - 1, ch: lastOfSubtree.lineText(lastOfSubtree.lines.length - 1).length } },
    { from: { item: firstItem, lineIndex: 0, ch: 0 }, to: { item: lastItem, lineIndex: lastItem.lines.length - 1, ch: lastItem.lineText(lastItem.lines.length - 1).length } },
  ];

  for (const rung of rungs) {
    if (contains(tree, rung, from, to) && !equals(tree, rung, from, to)) {
      tree.setSelection(rung.from, rung.to);
      return UPDATED;
    }
  }
  return PASS;
}
