/* Delete at the end of a line. Inside an item it joins the next notes line
 * onto this one. At the end of the item it merges the next item in when
 * that is safe (see merge.ts) and otherwise swallows the key. The cursor
 * does not move on a refusal. A folded item never merges what it hides. */
import { leadingWhitespace } from '../model';
import type { ListTree } from '../model';
import { canMerge, mergeInto } from './merge';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpResult } from './result';

export function deleteTillNextStart(tree: ListTree): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const { item, lineIndex, ch } = tree.selection.head;
  if (ch !== item.lineText(lineIndex).length) return PASS;

  if (lineIndex < item.lines.length - 1) {
    const next = item.lines[lineIndex + 1] ?? '';
    item.lines[lineIndex] = (item.lines[lineIndex] ?? '') + next.slice(leadingWhitespace(next).length);
    item.lines.splice(lineIndex + 1, 1);
    return UPDATED;
  }

  const later = tree.nextInOrder(item);
  if (!later || item.folded) return CONSUMED;
  if (!canMerge(item, later)) return CONSUMED;
  mergeInto(tree, item, later);
  return UPDATED;
}
