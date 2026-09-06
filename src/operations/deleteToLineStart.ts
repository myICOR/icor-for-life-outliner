/* Mod-Backspace deletes back to where the content starts and stops there,
 * whatever the editor's own line-start deletion would have taken. At the
 * content start already, the key is swallowed. */
import { parseBulletLine } from '../model';
import type { ListTree } from '../model';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';

export function deleteTillLineStart(tree: ListTree, ctx: OpContext): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const { item, lineIndex, ch } = tree.selection.head;
  const start = item.lineContentStart(lineIndex, ctx.mode);
  if (ch <= start) return CONSUMED;
  const text = item.lineText(lineIndex);
  const kept = text.slice(0, start) + text.slice(ch);
  if (lineIndex === 0) {
    /* The cut may have taken the task box with it (bullet-only mode), so
       the prefix is read again from what is left. */
    const bullet = parseBulletLine(kept);
    if (!bullet) return CONSUMED;
    item.bulletGap = bullet.bulletGap;
    item.checkbox = bullet.checkbox;
    item.checkboxGap = bullet.checkboxGap;
    item.lines[0] = bullet.content;
  } else {
    item.lines[lineIndex] = kept;
  }
  tree.setCursor(item, lineIndex, start);
  return UPDATED;
}
