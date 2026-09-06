/* Old lines against new lines: drop the common head and the common tail
 * and describe what is left as one replacement. Lines outside the span are
 * never touched, so their bytes, their folds and their history stay. */
import type { Position } from '../model';

export interface LineChange {
  from: Position;
  to: Position;
  text: string;
  /* Old lines replaced, inclusive; oldEnd < oldStart for a pure insertion. */
  oldStart: number;
  oldEnd: number;
  /* New lines that replaced them, inclusive; newEnd < newStart for a pure deletion. */
  newStart: number;
  newEnd: number;
}

export function computeChange(oldLines: readonly string[], newLines: readonly string[], startLine: number): LineChange | null {
  let p = 0;
  while (p < oldLines.length && p < newLines.length && oldLines[p] === newLines[p]) p++;
  let s = 0;
  while (s < oldLines.length - p && s < newLines.length - p && oldLines[oldLines.length - 1 - s] === newLines[newLines.length - 1 - s]) s++;

  const oldChanged = oldLines.slice(p, oldLines.length - s);
  const newChanged = newLines.slice(p, newLines.length - s);
  if (oldChanged.length === 0 && newChanged.length === 0) return null;

  const oldStart = startLine + p;
  const oldEnd = startLine + oldLines.length - s - 1;
  const newStart = startLine + p;
  const newEnd = startLine + newLines.length - s - 1;
  const lengthOf = (line: string | undefined): number => (line ?? '').length;

  if (oldChanged.length > 0 && newChanged.length > 0) {
    return {
      from: { line: oldStart, ch: 0 },
      to: { line: oldEnd, ch: lengthOf(oldLines[oldLines.length - s - 1]) },
      text: newChanged.join('\n'),
      oldStart, oldEnd, newStart, newEnd,
    };
  }
  if (newChanged.length === 0) {
    /* Lines vanish, together with one line break. */
    if (s > 0) {
      return { from: { line: oldStart, ch: 0 }, to: { line: oldEnd + 1, ch: 0 }, text: '', oldStart, oldEnd, newStart, newEnd };
    }
    if (p > 0) {
      return { from: { line: oldStart - 1, ch: lengthOf(oldLines[p - 1]) }, to: { line: oldEnd, ch: lengthOf(oldLines[oldLines.length - 1]) }, text: '', oldStart, oldEnd, newStart, newEnd };
    }
    return { from: { line: oldStart, ch: 0 }, to: { line: oldEnd, ch: lengthOf(oldLines[oldLines.length - 1]) }, text: '', oldStart, oldEnd, newStart, newEnd };
  }
  /* Lines appear, before the first kept tail line or after the last kept head line. */
  if (s > 0) {
    return { from: { line: oldStart, ch: 0 }, to: { line: oldStart, ch: 0 }, text: newChanged.join('\n') + '\n', oldStart, oldEnd, newStart, newEnd };
  }
  const at: Position = { line: oldStart - 1, ch: lengthOf(oldLines[p - 1]) };
  return { from: at, to: at, text: '\n' + newChanged.join('\n'), oldStart, oldEnd, newStart, newEnd };
}
