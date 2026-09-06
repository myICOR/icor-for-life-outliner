/* The cursor stays in the content and out of folded lines, on every
 * transaction that moves it, whatever moved it: a click, an arrow key,
 * another plugin, undo.
 *
 * This is a transaction filter rather than an extender on purpose. An
 * extender may add effects and annotations to a transaction and nothing
 * else; it cannot change the selection, so the only way to move a cursor
 * from an extender is a second transaction on a timer, which flickers and
 * splits the history. A filter rewrites the selection inside the same
 * transaction. The price is that it runs on every transaction, so it is
 * kept cheap: typing is skipped outright, only cursors (never ranges) are
 * looked at, and a line that is neither a bullet nor indented ends the
 * check before anything is parsed. Folds are read from the start state and
 * mapped, so the new state is never computed here. Two more skips: a `set`
 * transaction (a file load, core's own one-character syntax reset) is the
 * editor placing the cursor, not the user moving it; and a view that is
 * not its Editor's own (a table cell) is left alone. */
import { foldedRanges } from '@codemirror/language';
import { EditorSelection, EditorState } from '@codemirror/state';
import type { Extension, Transaction, TransactionSpec } from '@codemirror/state';
import type { LineSource, Position } from '../model';
import { keepCursorInContent, keepCursorOutsideFolded } from '../operations';
import type { HiddenRange } from '../operations';
import type { EditorHost } from './host';
import { ownEditor } from './registry';

const MAYBE_LIST_LINE = /^[ \t]*(?:[-*+]|\d+[.)])(?:[ \t]|$)|^[ \t]/;

function hiddenRangesOf(tr: Transaction): HiddenRange[] {
  const doc = tr.newDoc;
  const out: HiddenRange[] = [];
  foldedRanges(tr.startState)
    .map(tr.changes)
    .between(0, doc.length, (from, to) => {
      const root = doc.lineAt(from).number - 1;
      const end = doc.lineAt(to).number - 1;
      if (end > root) out.push({ root, start: root + 1, end });
    });
  return out;
}

export function cursorStick(host: EditorHost): Extension {
  return EditorState.transactionFilter.of((tr): TransactionSpec | readonly TransactionSpec[] => {
    const mode = host.settings.stickCursor;
    if (mode === 'never') return tr;
    if (!tr.selection && !tr.docChanged) return tr;
    if (tr.isUserEvent('input') || tr.isUserEvent('set')) return tr;
    if (!ownEditor(tr.startState)) return tr;

    const doc = tr.newDoc;
    const source: LineSource = {
      getLine: (n) => doc.line(n + 1).text,
      lastLine: () => doc.lines - 1,
    };
    let hidden: HiddenRange[] | null = null;
    let moved = false;

    const ranges = tr.newSelection.ranges.map((range) => {
      if (!range.empty) return range;
      const line = doc.lineAt(range.head);
      if (!MAYBE_LIST_LINE.test(line.text)) return range;
      const pos: Position = { line: line.number - 1, ch: range.head - line.from };
      hidden ??= hiddenRangesOf(tr);
      const unfolded = keepCursorOutsideFolded(source, hidden, pos) ?? pos;
      const target = keepCursorInContent(source, unfolded, mode) ?? unfolded;
      if (target.line === pos.line && target.ch === pos.ch) return range;
      moved = true;
      return EditorSelection.cursor(doc.line(target.line + 1).from + target.ch);
    });

    if (!moved) return tr;
    return [tr, { selection: EditorSelection.create(ranges, tr.newSelection.mainIndex) }];
  });
}
