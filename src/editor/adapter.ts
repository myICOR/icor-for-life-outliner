/* The engine's editor interface over Obsidian's Editor and the CodeMirror
 * view behind it. Text and selection go through the documented Editor
 * methods; folds go through @codemirror/language's fold effects, never
 * through CSS; the indent unit comes from the editor's own configuration.
 * The view is handed in by whoever already holds it (a keymap handler, or
 * the registry for commands); no private field is read to find it. */
import { foldEffect, foldable, foldedRanges, getIndentUnit, indentString, unfoldEffect } from '@codemirror/language';
import type { StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { Editor } from 'obsidian';
import type { LineChange, OutlinerEditor } from '../apply';
import type { Position, SelectionRange } from '../model';
import type { HiddenRange } from '../operations';
import { nodeNamesOnLine } from './syntax';

export class CmEditorAdapter implements OutlinerEditor {
  constructor(
    private readonly editor: Editor,
    private readonly view: EditorView,
    /* Called when a line cannot be folded at all (Obsidian's fold indent
       setting is off). */
    private readonly onFoldUnavailable: () => void,
  ) {}

  getLine(line: number): string {
    return this.editor.getLine(line);
  }

  lastLine(): number {
    return this.editor.lastLine();
  }

  listSelections(): SelectionRange[] {
    return this.editor.listSelections().map((s) => ({ anchor: { line: s.anchor.line, ch: s.anchor.ch }, head: { line: s.head.line, ch: s.head.ch } }));
  }

  setSelection(range: SelectionRange): void {
    this.editor.setSelection(range.anchor, range.head);
  }

  replaceRange(text: string, from: Position, to: Position): void {
    this.editor.replaceRange(text, from, to);
  }

  applyChanges(changes: readonly LineChange[]): void {
    this.editor.transaction({ changes: changes.map((c) => ({ from: c.from, to: c.to, text: c.text })) });
  }

  foldedLines(): number[] {
    const { doc } = this.view.state;
    const lines = new Set<number>();
    foldedRanges(this.view.state).between(0, doc.length, (from) => {
      lines.add(doc.lineAt(from).number - 1);
    });
    return [...lines].sort((a, b) => a - b);
  }

  hiddenLineRanges(): HiddenRange[] {
    const { doc } = this.view.state;
    const out: HiddenRange[] = [];
    foldedRanges(this.view.state).between(0, doc.length, (from, to) => {
      const root = doc.lineAt(from).number - 1;
      const end = doc.lineAt(to).number - 1;
      if (end > root) out.push({ root, start: root + 1, end });
    });
    return out;
  }

  fold(line: number): void {
    const { state } = this.view;
    const l = state.doc.line(line + 1);
    const range = foldable(state, l.from, l.to);
    if (!range) {
      this.onFoldUnavailable();
      return;
    }
    this.view.dispatch({ effects: foldEffect.of(range) });
  }

  unfold(line: number): void {
    const { state } = this.view;
    const l = state.doc.line(line + 1);
    const effects: StateEffect<unknown>[] = [];
    foldedRanges(state).between(l.from, l.to, (from, to) => {
      if (state.doc.lineAt(from).number === l.number) effects.push(unfoldEffect.of({ from, to }));
    });
    if (effects.length > 0) this.view.dispatch({ effects });
  }

  indentUnit(): string {
    return indentString(this.view.state, getIndentUnit(this.view.state));
  }

  nodeNamesAt(line: number): string[] {
    return nodeNamesOnLine(this.view.state, line);
  }
}
