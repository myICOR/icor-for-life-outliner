/* The fold marker: an Obsidian comment at the end of an item's line that
 * says "this item is folded", so the fold survives a reinstall, a new
 * device and any sync tool, none of which carry the editor's own fold
 * memory. Hidden in reading view; Live Preview and source mode show the
 * word faint at the line end. Written and removed only when the setting
 * is on; honoured on open either way. The marker is text, so the tree
 * keeps it in step with the fold flags inside the one edit an operation
 * makes; the editor layer covers folds made with the mouse.
 *
 * A trailing block id (` ^abc`) stays last. The editor and the metadata
 * cache accept `^id` only at the very end of a line, so the marker goes
 * before it: `- item %% fold %% ^abc`. The shape an earlier build wrote,
 * marker after the id, is still read and stripped, never written. */
import { parseBulletLine } from '../model';
import type { LineSource, ListTree } from '../model';

export const FOLD_MARKER = ' %% fold %%';

/* A block id at the very end of the line, with its leading space. */
const TRAILING_BLOCK_ID = /( \^[a-zA-Z0-9-]+)?$/;

/* The line split at the block id: what the marker attaches to, and the id
   that must stay last (empty when there is none). */
function splitBlockId(text: string): { body: string; id: string } {
  const id = TRAILING_BLOCK_ID.exec(text)?.[1] ?? '';
  return { body: text.slice(0, text.length - id.length), id };
}

export function hasFoldMarker(text: string): boolean {
  return text.endsWith(FOLD_MARKER) || splitBlockId(text).body.endsWith(FOLD_MARKER);
}

export function withFoldMarker(text: string): string {
  if (hasFoldMarker(text)) return text;
  const { body, id } = splitBlockId(text);
  return body + FOLD_MARKER + id;
}

export function withoutFoldMarker(text: string): string {
  if (text.endsWith(FOLD_MARKER)) return text.slice(0, -FOLD_MARKER.length);
  const { body, id } = splitBlockId(text);
  return body.endsWith(FOLD_MARKER) ? body.slice(0, -FOLD_MARKER.length) + id : text;
}

/* The edit that brings a bullet line's marker in step with `folded`, as
 * offsets into the line, or null when nothing needs to change or the line
 * is not a list item. */
export function foldMarkerEdit(text: string, folded: boolean): { from: number; to: number; insert: string } | null {
  if (!parseBulletLine(text)) return null;
  const marked = hasFoldMarker(text);
  if (folded === marked) return null;
  const { body } = splitBlockId(text);
  if (folded) return { from: body.length, to: body.length, insert: FOLD_MARKER };
  const end = text.endsWith(FOLD_MARKER) ? text.length : body.length;
  return { from: end - FOLD_MARKER.length, to: end, insert: '' };
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
