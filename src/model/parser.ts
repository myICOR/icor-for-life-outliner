/* Lines to tree. Starting from the cursor line, walk up to where the list
 * begins and down to where it ends, then build the tree from the literal
 * indentation. Nothing is normalised: a two-space list stays two-space, a
 * tab list stays tab, and a list that mixes the two is refused so no
 * operation ever guesses.
 *
 * What belongs to a list: bullet lines, indented lines (the notes of the
 * item above), and blank lines when the list continues after them. A
 * paragraph, a heading, a quote or a fence at column zero ends it. */
import { isMixedIndentation, lineKind, parseBulletLine } from './line';
import { ListItem, ListTree } from './tree';
import type { Loc } from './tree';
import type { SelectionRange } from './types';

export interface LineSource {
  getLine(line: number): string;
  lastLine(): number;
}

export interface ParseOptions {
  /* Absolute lines whose item is folded (the fold starts on that line). */
  foldedLines: readonly number[];
  indentUnit: string;
  selection: SelectionRange;
}

export type ParseFailure = 'no-list' | 'mixed-indentation' | 'cursor-outside';

export type ParseResult = { ok: true; tree: ListTree } | { ok: false; reason: ParseFailure };

function isListLine(kind: ReturnType<typeof lineKind>): boolean {
  return kind === 'bullet' || kind === 'indented' || kind === 'blank';
}

/* The first and last document lines of the list around `line`, or null. */
export function findListBounds(source: LineSource, line: number): { start: number; end: number } | null {
  const last = source.lastLine();
  if (line < 0 || line > last) return null;
  const kindAt = (n: number): ReturnType<typeof lineKind> => lineKind(source.getLine(n));
  const here = kindAt(line);
  if (here === 'other' || here === 'blank') return null;

  let start = line;
  while (start > 0 && isListLine(kindAt(start - 1))) start--;
  /* Leading notes or blanks with no bullet above them are not ours. */
  while (start <= line && kindAt(start) !== 'bullet') start++;
  if (start > line) return null;

  let end = line;
  while (end < last && isListLine(kindAt(end + 1))) end++;
  /* Trailing blanks belong to whatever follows, not to the list. */
  while (end > line && kindAt(end) === 'blank') end--;
  return { start, end };
}

export function parseList(source: LineSource, cursorLine: number, opts: ParseOptions): ParseResult {
  const bounds = findListBounds(source, cursorLine);
  if (!bounds) return { ok: false, reason: 'no-list' };

  const items: ListItem[] = [];
  const stack: ListItem[] = [];
  const indents: string[] = [];
  const folded = new Set(opts.foldedLines);

  for (let n = bounds.start; n <= bounds.end; n++) {
    const text = source.getLine(n);
    const bullet = parseBulletLine(text);
    if (bullet) {
      const item = new ListItem(bullet.indent, bullet.bullet, bullet.bulletGap, bullet.checkbox, bullet.checkboxGap, [bullet.content]);
      item.folded = folded.has(n);
      indents.push(bullet.indent);
      while (stack.length > 0 && (stack[stack.length - 1] as ListItem).indent.length >= bullet.indent.length) stack.pop();
      const parent = stack[stack.length - 1] ?? null;
      if (parent) {
        parent.children.push(item);
        item.parent = parent;
      } else {
        items.push(item);
      }
      stack.push(item);
    } else {
      /* A notes line or a blank: it rides with the item above it, always. */
      const owner = stack[stack.length - 1];
      if (!owner) return { ok: false, reason: 'no-list' };
      owner.lines.push(text);
    }
  }

  if (isMixedIndentation(indents)) return { ok: false, reason: 'mixed-indentation' };

  const probe = new ListTree(bounds.start, items, opts.indentUnit, { anchor: null, head: { item: items[0] as ListItem, lineIndex: 0, ch: 0 } });
  const head = probe.locate(opts.selection.head);
  if (!head) return { ok: false, reason: 'cursor-outside' };
  const anchor: Loc | null = probe.locate(opts.selection.anchor);
  probe.selection = { anchor, head };
  return { ok: true, tree: probe };
}
