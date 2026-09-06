/* Indentation arithmetic shared by indent, outdent, move and merge. The
 * rule that runs through all of it: an item's children keep their indent
 * RELATIVE to the item, and notes lines keep theirs, so moving a subtree
 * never changes its inner shape. */
import { leadingWhitespace } from '../model';
import type { ListItem, ListTree, Loc } from '../model';

/* The item's indent beyond its parent's (or the whole indent at the top). */
export function relativeIndent(item: ListItem): string {
  const base = item.parent ? item.parent.indent.length : 0;
  return item.indent.slice(base);
}

/* The indent step this parent already uses for its children, or null. */
export function childStep(parent: ListItem): string | null {
  const first = parent.children[0];
  if (!first) return null;
  const step = first.indent.slice(parent.indent.length);
  return step.length > 0 ? step : null;
}

/* The first indent step found anywhere in the list, or null for a flat list. */
export function listStep(tree: ListTree): string | null {
  for (const item of tree.itemsInOrder()) {
    const step = childStep(item);
    if (step) return step;
  }
  return null;
}

/* The step to use when `item` becomes a child of `parent`, in order of
 * trust: what the parent's children already use, what the item already
 * uses, what the list uses elsewhere, and only then the editor's unit. */
export function stepFor(tree: ListTree, parent: ListItem | null, item: ListItem): string {
  const own = relativeIndent(item);
  return (parent ? childStep(parent) : null) ?? (own.length > 0 ? own : null) ?? listStep(tree) ?? tree.indentUnit;
}

/* Re-indent a notes line that belonged to an item at `oldIndent`. Lines
 * indented no deeper than the old bullet are left alone: shifting them
 * could turn them into something that is no longer a notes line. */
export function shiftNotesLine(line: string, oldIndent: string, newIndent: string): string {
  const ws = leadingWhitespace(line);
  const rest = line.slice(ws.length);
  if (rest === '') return line;
  if (ws.length > oldIndent.length && ws.startsWith(oldIndent)) return newIndent + ws.slice(oldIndent.length) + rest;
  return line;
}

/* Set an item's indent and carry its notes lines and its whole subtree along. */
export function setIndent(item: ListItem, newIndent: string): void {
  const oldIndent = item.indent;
  item.indent = newIndent;
  for (let i = 1; i < item.lines.length; i++) item.lines[i] = shiftNotesLine(item.lines[i] ?? '', oldIndent, newIndent);
  for (const child of item.children) setIndent(child, newIndent + child.indent.slice(oldIndent.length));
}

/* Run `mutate`, then move every selection end that sat on a line whose
 * length changed by the same amount, so the cursor stays on its character. */
export function keepSelectionOnText(tree: ListTree, mutate: () => void): void {
  const ends: Loc[] = [];
  if (tree.selection.anchor) ends.push(tree.selection.anchor);
  if (tree.selection.head !== tree.selection.anchor) ends.push(tree.selection.head);
  const before = ends.map((l) => l.item.lineText(l.lineIndex).length);
  mutate();
  ends.forEach((l, i) => {
    const delta = l.item.lineText(l.lineIndex).length - (before[i] ?? 0);
    l.ch = Math.max(0, l.ch + delta);
  });
}
