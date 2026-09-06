/* Move to. The item with its subtree (or the selected items) goes under a
 * target somewhere in the same file: as the last child of a list item, or
 * as the last top-level item of the list at the end of a heading's
 * section, a list being started there when the section has none. The
 * target may be in the same list, in which case this is one detach and
 * one attach like every other move; or elsewhere in the file, in which
 * case two spans change (the lines leave one list and arrive in another)
 * as one transaction and one undo step. Folds travel with the items, the
 * cursor lands on the moved item, and a target inside the moved items is
 * refused. The picker that offers the targets is a thin shell around
 * `moveTargets`; everything that decides lives here. */
import { computeChange, reconcileFolds, unfoldSpan } from './apply';
import type { LineChange, OutlinerEditor } from './apply';
import type { ActionOutcome } from './actions';
import { classifyNodeNames } from './editor/nodes';
import { ListTree, findListBounds, lineKind, parseBulletLine, parseList, printTree } from './model';
import type { ListItem, Position, SelectionRange } from './model';
import { renumber, selectedItems, setIndent, setWholeItemSelection, stepFor, syncFoldMarkers } from './operations';
import type { ItemSelection } from './operations';
import type { OutlinerSettings } from './settings/model';

export interface MoveTarget {
  line: number;
  kind: 'heading' | 'item';
  /* The text as shown: the heading without its hashes, or the item's
     content with its task box. */
  text: string;
  /* One-based: the heading level, or the item's nesting depth. */
  depth: number;
}

const HEADING_RE = /^(#{1,6})[ \t]+(.*)$/;

export function headingOf(text: string): { level: number; text: string } | null {
  const m = HEADING_RE.exec(text);
  return m ? { level: (m[1] ?? '').length, text: (m[2] ?? '').trim() } : null;
}

function cursorAt(line: number): SelectionRange {
  return { anchor: { line, ch: 0 }, head: { line, ch: 0 } };
}

function parseAt(editor: OutlinerEditor, line: number, selection: SelectionRange): ListTree | null {
  const parsed = parseList(editor, line, { foldedLines: editor.foldedLines(), indentUnit: editor.indentUnit(), selection });
  return parsed.ok ? parsed.tree : null;
}

function isHeadingLine(editor: OutlinerEditor, line: number): boolean {
  const text = editor.getLine(line);
  return lineKind(text) === 'other' && headingOf(text) !== null && classifyNodeNames(editor.nodeNamesAt(line)) !== 'other';
}

/* The lines the selected items and their subtrees occupy. */
function linesOf(tree: ListTree, items: readonly ListItem[]): Set<number> {
  const out = new Set<number>();
  for (const item of items) {
    const start = tree.lineOf(item);
    for (let n = 0; n < item.subtreeLineCount(); n++) out.add(start + n);
  }
  return out;
}

/* Every heading and list item in the file, in order, minus the items
 * about to move. Lists that cannot be parsed (mixed indentation) and
 * lines the syntax tree calls something else are left out. */
export function moveTargets(editor: OutlinerEditor, selection: SelectionRange): MoveTarget[] {
  const source = parseAt(editor, selection.head.line, selection);
  const sel = source ? selectedItems(source) : null;
  const excluded = source && sel ? linesOf(source, sel.items) : new Set<number>();
  const out: MoveTarget[] = [];
  let listEnd = -1;
  for (let n = 0; n <= editor.lastLine(); n++) {
    const text = editor.getLine(n);
    if (n <= listEnd || classifyNodeNames(editor.nodeNamesAt(n)) === 'other') continue;
    const heading = lineKind(text) === 'other' ? headingOf(text) : null;
    if (heading) {
      out.push({ line: n, kind: 'heading', text: heading.text, depth: heading.level });
      continue;
    }
    if (!parseBulletLine(text)) continue;
    const bounds = findListBounds(editor, n);
    if (!bounds) continue;
    listEnd = bounds.end;
    const tree = parseAt(editor, n, cursorAt(n));
    if (!tree) continue;
    for (const item of tree.itemsInOrder()) {
      const line = tree.lineOf(item);
      if (excluded.has(line)) continue;
      out.push({ line, kind: 'item', text: (item.checkbox ? item.checkbox + ' ' : '') + (item.lines[0] ?? ''), depth: item.level });
    }
  }
  return out;
}

type Destination =
  | { kind: 'list'; tree: ListTree; parent: ListItem | null }
  | { kind: 'new-list'; anchorLine: number; blankBefore: boolean };

/* The last non-blank line of a heading's section, and whether the
 * section already holds a list. */
function sectionOf(editor: OutlinerEditor, headingLine: number): { end: number; lastList: number | null } {
  const level = headingOf(editor.getLine(headingLine))?.level ?? 6;
  let end = headingLine;
  let lastList: number | null = null;
  for (let n = headingLine + 1; n <= editor.lastLine(); n++) {
    const h = isHeadingLine(editor, n) ? headingOf(editor.getLine(n)) : null;
    if (h && h.level <= level) break;
    if (lineKind(editor.getLine(n)) !== 'blank') end = n;
    if (parseBulletLine(editor.getLine(n)) && classifyNodeNames(editor.nodeNamesAt(n)) !== 'other') {
      const bounds = findListBounds(editor, n);
      if (bounds) lastList = bounds.start;
    }
  }
  return { end, lastList };
}

function destinationFor(editor: OutlinerEditor, targetLine: number): Destination | null {
  const text = editor.getLine(targetLine);
  if (classifyNodeNames(editor.nodeNamesAt(targetLine)) === 'other') return null;
  if (parseBulletLine(text)) {
    const tree = parseAt(editor, targetLine, cursorAt(targetLine));
    const found = tree?.locateLine(targetLine);
    if (!tree || !found || found.lineIndex !== 0) return null;
    return { kind: 'list', tree, parent: found.item };
  }
  if (!isHeadingLine(editor, targetLine)) return null;
  const section = sectionOf(editor, targetLine);
  if (section.lastList !== null) {
    const tree = parseAt(editor, section.lastList, cursorAt(section.lastList));
    return tree ? { kind: 'list', tree, parent: null } : null;
  }
  return { kind: 'new-list', anchorLine: section.end, blankBefore: section.end !== targetLine };
}

function outcome(consume: boolean, changed: boolean, reason: string): ActionOutcome {
  return { consume, changed, reason };
}

/* Put the moved items under `parent` in `tree` (top level when null), at
 * the indent the destination already uses. */
function attachAll(tree: ListTree, parent: ListItem | null, items: readonly ListItem[]): void {
  const first = items[0] as ListItem;
  const last = tree.items[tree.items.length - 1];
  const base = parent ? parent.indent + stepFor(tree, parent, first) : (last?.indent ?? '');
  for (const item of items) {
    tree.attach(item, parent, parent ? parent.children.length : tree.items.length);
    setIndent(item, base);
  }
  if (parent) parent.folded = false;
  renumber(tree);
}

function settle(tree: ListTree, sel: ItemSelection, mode: OutlinerSettings['stickCursor']): void {
  const first = sel.items[0] as ListItem;
  if (sel.whole) setWholeItemSelection(tree, sel.anchorItem, sel.headItem);
  else tree.setCursor(first, 0, first.contentStart(mode));
}

function lineDelta(change: LineChange): number {
  return change.text.split('\n').length - 1 - (change.to.line - change.from.line);
}

function shifted(pos: Position, lines: number): Position {
  return { line: pos.line + lines, ch: pos.ch };
}

export function runMoveTo(editor: OutlinerEditor, settings: OutlinerSettings, targetLine: number): ActionOutcome {
  const selections = editor.listSelections();
  const selection = selections[0];
  if (selections.length !== 1 || !selection) return outcome(false, false, 'one selection at a time');
  if (classifyNodeNames(editor.nodeNamesAt(selection.head.line)) === 'other') return outcome(false, false, 'not a list line');
  const source = parseAt(editor, selection.head.line, selection);
  if (!source) return outcome(false, false, 'no list under the cursor');
  const sel = selectedItems(source);
  if (!sel) return outcome(false, false, 'the selection is not whole items');
  if (linesOf(source, sel.items).has(targetLine)) return outcome(true, false, 'the target is inside the moved items');
  if (targetLine < 0 || targetLine > editor.lastLine()) return outcome(true, false, 'no such line');

  const before = printTree(source);
  const dest = destinationFor(editor, targetLine);
  if (!dest) return outcome(true, false, 'the target is not a heading or a list item');
  const mode = settings.stickCursor;

  /* Same list: one detach, one attach, one replaceRange. */
  const sameList = dest.kind === 'list' && dest.tree.startLine === source.startLine;
  if (sameList) {
    const parent = dest.parent ? (source.locateLine(targetLine)?.item ?? null) : null;
    for (const item of sel.items) source.detach(item);
    attachAll(source, parent, sel.items);
    settle(source, sel, mode);
    if (settings.foldMarkers) syncFoldMarkers(source);
    const change = computeChange(before, printTree(source), source.startLine);
    if (change) {
      unfoldSpan(editor, change);
      editor.replaceRange(change.text, change.from, change.to);
    }
    reconcileFolds(editor, source);
    const head = source.absolute(source.selection.head);
    const anchor = source.selection.anchor ? source.absolute(source.selection.anchor) : head;
    editor.setSelection({ anchor, head });
    return outcome(true, change !== null, 'applied');
  }

  /* Elsewhere in the file: the lines leave one span and arrive in another. */
  for (const item of sel.items) source.detach(item);
  renumber(source);
  let target: ListTree;
  let arrival: LineChange;
  if (dest.kind === 'list') {
    target = dest.tree;
    const old = printTree(target);
    attachAll(target, dest.parent, sel.items);
    if (settings.foldMarkers) syncFoldMarkers(target);
    arrival = computeChange(old, printTree(target), target.startLine) as LineChange;
  } else {
    const first = sel.items[0] as ListItem;
    const startLine = dest.anchorLine + 1 + (dest.blankBefore ? 1 : 0);
    target = new ListTree(startLine, [], editor.indentUnit(), { anchor: null, head: { item: first, lineIndex: 0, ch: 0 } });
    attachAll(target, null, sel.items);
    if (settings.foldMarkers) syncFoldMarkers(target);
    const lines = printTree(target);
    const at: Position = { line: dest.anchorLine, ch: editor.getLine(dest.anchorLine).length };
    arrival = {
      from: at,
      to: at,
      text: (dest.blankBefore ? '\n' : '') + '\n' + lines.join('\n'),
      oldStart: dest.anchorLine + 1,
      oldEnd: dest.anchorLine,
      newStart: dest.anchorLine + 1,
      newEnd: startLine + lines.length - 1,
    };
  }
  if (settings.foldMarkers) syncFoldMarkers(source);
  const departure = computeChange(before, printTree(source), source.startLine) as LineChange;
  settle(target, sel, mode);

  unfoldSpan(editor, departure);
  unfoldSpan(editor, arrival);
  editor.applyChanges([departure, arrival]);

  /* Whichever span came first in the file shifts the lines of the other,
     by the lines its text adds minus the lines its span removes (a list
     that empties leaves its line behind, so the ranges alone would lie). */
  const departureDelta = lineDelta(departure);
  const arrivalDelta = lineDelta(arrival);
  const sourceFirst = source.startLine < target.startLine;
  reconcileFolds(editor, source, sourceFirst ? 0 : arrivalDelta);
  const targetOffset = sourceFirst ? departureDelta : 0;
  reconcileFolds(editor, target, targetOffset);
  const head = shifted(target.absolute(target.selection.head), targetOffset);
  const anchor = target.selection.anchor ? shifted(target.absolute(target.selection.anchor), targetOffset) : head;
  editor.setSelection({ anchor, head });
  return outcome(true, true, 'applied');
}
