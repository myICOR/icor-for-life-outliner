/* An editor made of strings. It implements exactly the surface the engine
 * uses, checks every position it is handed (an out-of-range position is a
 * bug the engine must never produce), counts replaceRange calls so a test
 * can pin "one edit per operation", and keeps folds by their root line the
 * way the real editor's fold state would survive a replacement: a fold
 * whose root line is rewritten is lost, folds below the edit shift with it. */
import type { OutlinerEditor } from '../src/apply';
import { leadingWhitespace, lineKind } from '../src/model';
import type { Position, SelectionRange } from '../src/model';
import type { HiddenRange } from '../src/operations';

export class FakeEditor implements OutlinerEditor {
  lines: string[];
  selections: SelectionRange[];
  folds = new Set<number>();
  nodes = new Map<number, string[]>();
  unit: string;
  replaceCalls = 0;
  foldCalls: string[] = [];

  constructor(lines: string[], selections: SelectionRange[], unit = '  ') {
    this.lines = [...lines];
    this.selections = selections.map((s) => ({ anchor: { ...s.anchor }, head: { ...s.head } }));
    this.unit = unit;
  }

  getLine(line: number): string {
    const text = this.lines[line];
    if (text === undefined) throw new RangeError(`getLine(${line}) outside the document`);
    return text;
  }

  lastLine(): number {
    return this.lines.length - 1;
  }

  listSelections(): SelectionRange[] {
    return this.selections.map((s) => ({ anchor: { ...s.anchor }, head: { ...s.head } }));
  }

  setSelection(range: SelectionRange): void {
    this.check(range.anchor);
    this.check(range.head);
    this.selections = [{ anchor: { ...range.anchor }, head: { ...range.head } }];
  }

  replaceRange(text: string, from: Position, to: Position): void {
    this.check(from);
    this.check(to);
    if (from.line > to.line || (from.line === to.line && from.ch > to.ch)) throw new RangeError('replaceRange with from after to');
    this.replaceCalls++;
    const head = this.getLine(from.line).slice(0, from.ch);
    const tail = this.getLine(to.line).slice(to.ch);
    const inserted = (head + text + tail).split('\n');
    const removed = to.line - from.line + 1;
    const replaces = from.line !== to.line || from.ch !== to.ch;
    const delta = inserted.length - removed;
    const kept = new Set<number>();
    for (const root of this.folds) {
      if (root < from.line) kept.add(root);
      else if (root > to.line) kept.add(root + delta);
      else if (!replaces) kept.add(from.ch === 0 ? root + delta : root);
      else if (root === to.line && to.ch === 0) kept.add(root + delta);
    }
    this.folds = kept;
    this.lines.splice(from.line, removed, ...inserted);
  }

  foldedLines(): number[] {
    return [...this.folds].sort((a, b) => a - b);
  }

  /* A folded line hides every following line indented deeper than it, and
     the blank lines between such lines, the way the editor's indent folding
     does. */
  hiddenLineRanges(): HiddenRange[] {
    const out: HiddenRange[] = [];
    for (const root of this.foldedLines()) {
      const depth = leadingWhitespace(this.getLine(root)).length;
      let end = root;
      for (let n = root + 1; n <= this.lastLine(); n++) {
        const kind = lineKind(this.getLine(n));
        if (kind === 'blank') continue;
        if (leadingWhitespace(this.getLine(n)).length > depth) end = n;
        else break;
      }
      if (end > root) out.push({ root, start: root + 1, end });
    }
    return out;
  }

  fold(line: number): void {
    this.foldCalls.push(`fold ${line}`);
    if (this.hiddenLineRangesFor(line)) this.folds.add(line);
  }

  unfold(line: number): void {
    this.foldCalls.push(`unfold ${line}`);
    this.folds.delete(line);
  }

  indentUnit(): string {
    return this.unit;
  }

  nodeNamesAt(line: number): string[] {
    return this.nodes.get(line) ?? [];
  }

  private hiddenLineRangesFor(line: number): boolean {
    const depth = leadingWhitespace(this.getLine(line)).length;
    const next = this.lines[line + 1];
    return next !== undefined && lineKind(next) !== 'blank' && leadingWhitespace(next).length > depth;
  }

  private check(pos: Position): void {
    const text = this.lines[pos.line];
    if (text === undefined) throw new RangeError(`line ${pos.line} outside the document`);
    if (pos.ch < 0 || pos.ch > text.length) throw new RangeError(`ch ${pos.ch} outside line ${pos.line} (${text.length} long)`);
  }
}
