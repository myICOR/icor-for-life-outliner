/* Backspace at the start of the content. On a notes line it joins the line
 * above inside the same item. On the bullet line it merges into the item
 * above when that is safe (see merge.ts) and otherwise swallows the key:
 * Backspace never eats a bullet. Anywhere else in the line the editor's own
 * Backspace runs.
 *
 * One deliberate opening: the first item of a list, empty and childless,
 * lets Backspace through, because deleting into that bullet is the only way
 * to get rid of it. */
import { leadingWhitespace } from '../model';
import type { ListTree } from '../model';
import { canMerge, mergeInto } from './merge';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';

export function deleteTillPreviousEnd(tree: ListTree, ctx: OpContext): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const { item, lineIndex, ch } = tree.selection.head;
  if (ch !== item.lineContentStart(lineIndex, ctx.mode)) return PASS;

  if (lineIndex > 0) {
    const text = item.lines[lineIndex] ?? '';
    const rest = text.slice(leadingWhitespace(text).length);
    const joinCh = item.lineText(lineIndex - 1).length;
    item.lines[lineIndex - 1] = (item.lines[lineIndex - 1] ?? '') + rest;
    item.lines.splice(lineIndex, 1);
    tree.setCursor(item, lineIndex - 1, joinCh);
    return UPDATED;
  }

  const earlier = tree.previousInOrder(item);
  if (!earlier) return item.isEmpty() && !item.hasChildren() ? PASS : CONSUMED;
  if (tree.isHidden(earlier) || !canMerge(earlier, item)) return CONSUMED;
  const at = mergeInto(tree, earlier, item);
  tree.setCursor(at.item, at.lineIndex, at.ch);
  return UPDATED;
}
