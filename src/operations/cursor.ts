/* The cursor rules that run outside any key: keep the cursor in the
 * content of a list line, and keep it out of folded lines. Both are pure
 * over line text and fold ranges so the editor layer can run them on every
 * transaction without building a tree. ArrowLeft's jump lives here too. */
import { leadingWhitespace, lineKind, parseBulletLine } from '../model';
import type { LineSource, ListTree, Position, StickMode } from '../model';
import { CONSUMED, PASS, UPDATED } from './result';
import type { OpContext, OpResult } from './result';

export interface HiddenRange {
  /* The folded item's own line, still visible. */
  root: number;
  /* First and last hidden line, inclusive. */
  start: number;
  end: number;
}

/* Content start of a bullet line under the given mode, or null when the
 * line is not a bullet line. */
export function bulletContentStart(text: string, mode: StickMode): number | null {
  const b = parseBulletLine(text);
  if (!b) return null;
  const afterBullet = b.indent.length + b.bullet.length + b.bulletGap.length;
  if (mode === 'bullet-and-checkbox' && b.checkbox) return afterBullet + b.checkbox.length + b.checkboxGap.length;
  return afterBullet;
}

/* Is this indented line the notes line of some bullet above it? A short
 * upward walk, capped, so the check stays cheap on every transaction. */
export function isNotesLine(source: LineSource, line: number, cap = 200): boolean {
  if (lineKind(source.getLine(line)) !== 'indented') return false;
  for (let n = line - 1, steps = 0; n >= 0 && steps < cap; n--, steps++) {
    const kind = lineKind(source.getLine(n));
    if (kind === 'bullet') return true;
    if (kind === 'other') return false;
  }
  return false;
}

/* Where a cursor on `line` may stand at the earliest, or null when the
 * line is not part of a list. */
export function contentStartOfLine(source: LineSource, line: number, mode: StickMode): number | null {
  const text = source.getLine(line);
  const bullet = bulletContentStart(text, mode);
  if (bullet !== null) return bullet;
  if (isNotesLine(source, line)) return leadingWhitespace(text).length;
  return null;
}

/* The position a cursor should be moved to, or null to leave it alone. */
export function keepCursorInContent(source: LineSource, pos: Position, mode: StickMode): Position | null {
  if (mode === 'never') return null;
  const start = contentStartOfLine(source, pos.line, mode);
  if (start === null || pos.ch >= start) return null;
  return { line: pos.line, ch: start };
}

/* A cursor that landed on a hidden line goes to the end of the line that
 * folds it. */
export function keepCursorOutsideFolded(source: LineSource, hidden: readonly HiddenRange[], pos: Position): Position | null {
  let target: HiddenRange | null = null;
  for (const range of hidden) {
    if (pos.line >= range.start && pos.line <= range.end && (target === null || range.root < target.root)) target = range;
  }
  if (!target) return null;
  return { line: target.root, ch: source.getLine(target.root).length };
}

/* ArrowLeft at the content start jumps to the end of the previous visible
 * line of the list: the line above, or the folded item that hides it. */
export function moveToPreviousLineEnd(tree: ListTree, ctx: OpContext): OpResult {
  if (!tree.hasSingleCursor()) return PASS;
  const { item, lineIndex, ch } = tree.selection.head;
  if (ch !== item.lineContentStart(lineIndex, ctx.mode)) return PASS;
  if (lineIndex > 0) {
    tree.setCursor(item, lineIndex - 1, item.lineText(lineIndex - 1).length);
    return UPDATED;
  }
  const earlier = tree.previousInOrder(item);
  if (!earlier) return CONSUMED;
  const root = tree.outermostFoldedAncestor(earlier);
  const target = root ?? earlier;
  const index = root ? 0 : target.lines.length - 1;
  tree.setCursor(target, index, target.lineText(index).length);
  return UPDATED;
}
