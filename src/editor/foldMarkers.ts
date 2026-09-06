/* Folds made outside the plugin's own operations (the fold gutter,
 * Obsidian's fold commands) reach the file through a transaction filter:
 * when the file remembers folds, a fold effect on an item line appends
 * the marker and an unfold effect removes it, inside the same
 * transaction, so there is nothing to undo separately. The plugin's own
 * fold dispatches (the applicator lifting a fold before a replace and
 * putting it back after) are annotated and skipped, because the tree
 * already keeps the marker in the text it writes.
 *
 * On open, the markers in the file are read and the folds applied. The
 * dispatch runs on a microtask: a view plugin may not dispatch while the
 * view is being built. Both halves step aside in a view that is not its
 * Editor's own (a table cell).
 *
 * Obsidian's own fold restore on open is a plain, unannotated dispatch of
 * fold effects, so it passes through the filter like a gutter click: with
 * the setting on, opening a note writes markers for every fold Obsidian
 * remembers that the file does not. Documented as the behaviour for
 * 0.1.0; the settling-window guard is the follow-up named in the release
 * notes. */
import { foldEffect, foldable, unfoldEffect } from '@codemirror/language';
import { Annotation, EditorState } from '@codemirror/state';
import type { Extension, StateEffect, Transaction, TransactionSpec } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import type { LineSource } from '../model';
import { foldMarkerEdit, markedFoldLines } from '../operations';
import type { EditorHost } from './host';
import { ownEditor } from './registry';

/* Marks a transaction whose fold effects the plugin issued itself. */
export const ownFoldChange = Annotation.define<boolean>();

interface Change {
  from: number;
  to: number;
  insert: string;
}

function markerChanges(tr: Transaction): Change[] {
  const doc = tr.newDoc;
  const out: Change[] = [];
  const seen = new Set<number>();
  const consider = (pos: number, folded: boolean): void => {
    const line = doc.lineAt(pos);
    if (seen.has(line.number)) return;
    seen.add(line.number);
    const edit = foldMarkerEdit(line.text, folded);
    if (edit) out.push({ from: line.from + edit.from, to: line.from + edit.to, insert: edit.insert });
  };
  for (const effect of tr.effects) {
    if (effect.is(foldEffect)) consider(effect.value.from, true);
    else if (effect.is(unfoldEffect)) consider(effect.value.from, false);
  }
  return out;
}

function markerFilter(host: EditorHost): Extension {
  return EditorState.transactionFilter.of((tr): TransactionSpec | readonly TransactionSpec[] => {
    if (!host.settings.foldMarkers || tr.annotation(ownFoldChange) || tr.effects.length === 0) return tr;
    if (!ownEditor(tr.startState)) return tr;
    const changes = markerChanges(tr);
    if (changes.length === 0) return tr;
    return [tr, { changes, sequential: true }];
  });
}

/* The fold effects for every marked item line that can be folded. */
export function foldsFromMarkers(view: EditorView): StateEffect<{ from: number; to: number }>[] {
  const { state } = view;
  const source: LineSource = { getLine: (n) => state.doc.line(n + 1).text, lastLine: () => state.doc.lines - 1 };
  const effects: StateEffect<{ from: number; to: number }>[] = [];
  for (const n of markedFoldLines(source)) {
    const line = state.doc.line(n + 1);
    const range = foldable(state, line.from, line.to);
    if (range) effects.push(foldEffect.of(range));
  }
  return effects;
}

const applyMarkersOnOpen = ViewPlugin.define((view) => {
  const doc = view.state.doc;
  let alive = true;
  void Promise.resolve().then(() => {
    if (!alive || view.state.doc !== doc || !ownEditor(view.state)) return;
    const effects = foldsFromMarkers(view);
    if (effects.length > 0) view.dispatch({ effects, annotations: ownFoldChange.of(true) });
  });
  return {
    destroy() {
      alive = false;
    },
  };
});

export function foldMarkers(host: EditorHost): Extension[] {
  return [markerFilter(host), applyMarkersOnOpen];
}
