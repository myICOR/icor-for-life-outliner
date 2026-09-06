/* What the engine needs from an editor, and nothing more. The CodeMirror
 * adapter implements it inside Obsidian; the fake in test/ implements it
 * over an array of strings. Positions are Obsidian's zero-based
 * `{ line, ch }`. */
import type { LineSource, Position, SelectionRange } from '../model';
import type { HiddenRange } from '../operations';
import type { LineChange } from './diff';

export interface OutlinerEditor extends LineSource {
  listSelections(): SelectionRange[];
  setSelection(range: SelectionRange): void;
  /* Replace [from, to) with `text`, which may span lines. The engine issues
     at most one of these per operation. */
  replaceRange(text: string, from: Position, to: Position): void;
  /* Several replacements that do not overlap, as ONE transaction and one
     undo step; every position is in the document before any of them. The
     engine uses this only when a change has two spans (move to another
     list in the file). */
  applyChanges(changes: readonly LineChange[]): void;
  /* Lines that start a fold (the folded item's own line). */
  foldedLines(): number[];
  /* The lines those folds hide. */
  hiddenLineRanges(): HiddenRange[];
  /* Fold the list item on `line`; a no-op when it cannot be folded. */
  fold(line: number): void;
  unfold(line: number): void;
  /* The editor's indent unit as a string of tabs or spaces. */
  indentUnit(): string;
  /* Syntax-tree node names touching `line`, the way Obsidian names them
     (for example `HyperMD-list-line_HyperMD-list-line-1`). Empty when the
     tree does not know the line. */
  nodeNamesAt(line: number): string[];
}
