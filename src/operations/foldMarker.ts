/* The fold marker: an Obsidian comment at the end of an item's line that
 * says "this item is folded", so the fold survives a reinstall, a new
 * device and any sync tool, none of which carry the editor's own fold
 * memory. Invisible in reading view. Written and removed only when the
 * setting is on; honoured on open either way. The marker is text, so the
 * tree keeps it in step with the fold flags inside the one edit an
 * operation makes; the editor layer covers folds made with the mouse. */
import { parseBulletLine } from '../model';
import type { LineSource, ListTree } from '../model';

export const FOLD_MARKER = ' %% fold %%';

export function hasFoldMarker(text: string): boolean {
  return text.endsWith(FOLD_MARKER);
}

export function withFoldMarker(text: string): string {
  return hasFoldMarker(text) ? text : text + FOLD_MARKER;
}

export function withoutFoldMarker(text: string): string {
  return hasFoldMarker(text) ? text.slice(0, -FOLD_MARKER.length) : text;
}

/* The edit that brings a bullet line's marker in step with `folded`, as
 * offsets into the line, or null when nothing needs to change or the line
 * is not a list item. */
export function foldMarkerEdit(text: string, folded: boolean): { from: number; to: number; insert: string } | null {
  if (!parseBulletLine(text)) return null;
  if (folded && !hasFoldMarker(text)) return { from: text.length, to: text.length, insert: FOLD_MARKER };
  if (!folded && hasFoldMarker(text)) return { from: text.length - FOLD_MARKER.length, to: text.length, insert: '' };
  return null;
}

/* Bullet lines whose fold the file remembers. */
export function markedFoldLines(source: LineSource): number[] {
  const out: number[] = [];
  for (let n = 0; n <= source.lastLine(); n++) {
    const text = source.getLine(n);
    if (hasFoldMarker(text) && parseBulletLine(text)) out.push(n);
  }
  return out;
}

/* Every item's marker against its fold flag. Returns how many lines changed. */
export function syncFoldMarkers(tree: ListTree): number {
  let changed = 0;
  for (const item of tree.itemsInOrder()) {
    const before = item.lines[0] ?? '';
    const after = item.folded && item.hasChildren() ? withFoldMarker(before) : withoutFoldMarker(before);
    if (after !== before) {
      item.lines[0] = after;
      changed++;
    }
  }
  return changed;
}
