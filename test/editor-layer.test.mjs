/* The transaction filters against a real EditorState. Each case builds a
 * state whose `editorInfoField` names an Editor, dispatches one
 * transaction, and reads the result. The Editor is a stub over a Text:
 * the same Text as the state's for a paired editor, another for the
 * parent-of-a-table-cell shape Flint found (H1). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState, Text } from '@codemirror/state';
import { foldEffect, foldService } from '@codemirror/language';
import * as cm from './build/cm.mjs';
import { cursorStick, editorInfoField, foldMarkers, foldsFromMarkers, ownEditor, ownFoldChange } from './build/cm.mjs';
import { runSchemeCases } from './lib/scheme-cases.mjs';
import { DEFAULT_SETTINGS } from './build/pure.mjs';

function editorOver(text) {
  const doc = Text.of(text.split('\n'));
  return { lineCount: () => doc.lines, lastLine: () => doc.lines - 1, getLine: (n) => doc.line(n + 1).text };
}

function host(overrides = {}) {
  return { settings: { ...DEFAULT_SETTINGS, ...overrides }, log() {}, foldUnavailable() {}, registerDomEvent() {} };
}

function stateWith(doc, editor, extensions) {
  return EditorState.create({ doc, extensions: [editorInfoField.init(() => ({ editor })), ...extensions] });
}

/* A stand-in for Obsidian's "Fold indent" service: a line folds from its
   end to the end of the run of deeper-indented lines under it. */
const indentFolding = foldService.of((state, from, to) => {
  const line = state.doc.lineAt(from);
  const depth = line.text.search(/\S/);
  let end = line.number;
  for (let n = line.number + 1; n <= state.doc.lines; n++) {
    const next = state.doc.line(n);
    const d = next.text.search(/\S/);
    if (d === -1 || d > depth) end = n;
    else break;
  }
  return end > line.number ? { from: to, to: state.doc.line(end).to } : null;
});

const DOC = '- a\n  - b\n- c';

test('ownEditor: the Editor only when its document is the view\'s document', () => {
  const paired = stateWith(DOC, editorOver(DOC), []);
  assert.equal(ownEditor(paired), paired.field(editorInfoField).editor);
  const cellShape = stateWith('5', editorOver(DOC), []);
  assert.equal(ownEditor(cellShape), null, 'a table cell view with the parent note\'s Editor');
  const sameCountOtherText = stateWith('x\ny\nz', editorOver(DOC), []);
  assert.equal(ownEditor(sameCountOtherText), null);
  const forgedFirstLine = stateWith('- a\n  - b\n- q', editorOver(DOC), []);
  assert.equal(ownEditor(forgedFirstLine), null, 'a multi-line cell that shares the count and the first line (Flint L4)');
  assert.equal(ownEditor(EditorState.create({ doc: DOC })), null, 'no editorInfoField at all');
});

test('cursor filter: a pointer selection inside the bullet moves to the content start (the control case)', () => {
  const s = stateWith(DOC, editorOver(DOC), [cursorStick(host())]);
  const tr = s.update({ selection: { anchor: 0 }, userEvent: 'select.pointer' });
  assert.equal(tr.state.selection.main.head, 2);
  assert.ok(tr.isUserEvent('select.pointer'), 'the user event survives the filter');
});

test('cursor filter: the Editor of another document (a table cell) leaves the selection alone', () => {
  const s = stateWith('- 5', editorOver(DOC), [cursorStick(host())]);
  const tr = s.update({ selection: { anchor: 0 }, userEvent: 'select.pointer' });
  assert.equal(tr.state.selection.main.head, 0);
});

test('fold-marker filter: a fold effect from outside the plugin writes the marker when the file remembers folds (the control case)', () => {
  const s = stateWith(DOC, editorOver(DOC), [foldMarkers(host({ foldMarkers: true }))]);
  const tr = s.update({ effects: foldEffect.of({ from: 3, to: 9 }) });
  assert.equal(tr.state.doc.toString(), '- a %% fold %%\n  - b\n- c');
  const own = s.update({ effects: foldEffect.of({ from: 3, to: 9 }), annotations: ownFoldChange.of(true) });
  assert.equal(own.state.doc.toString(), DOC, 'the plugin\'s own fold dispatches are skipped');
});

test('fold-marker filter: the Editor of another document (a table cell) writes nothing', () => {
  const s = stateWith('- a\n  - b', editorOver(DOC), [foldMarkers(host({ foldMarkers: true }))]);
  const tr = s.update({ effects: foldEffect.of({ from: 3, to: 8 }) });
  assert.equal(tr.state.doc.toString(), '- a\n  - b');
});

test('cursor filter: a set transaction (file load, syntax reset) is the editor placing the cursor and is left alone', () => {
  const s = stateWith(DOC, editorOver(DOC), [cursorStick(host())]);
  const tr = s.update({ selection: { anchor: 0 }, userEvent: 'set' });
  assert.equal(tr.state.selection.main.head, 0);
});

test('fold-marker filter: a gutter fold on an item with a block id puts the marker before the id', () => {
  const doc = '- a ^abc\n  - b\n- c';
  const s = stateWith(doc, editorOver(doc), [foldMarkers(host({ foldMarkers: true }))]);
  const tr = s.update({ effects: foldEffect.of({ from: 8, to: 14 }) });
  assert.equal(tr.state.doc.toString(), '- a %% fold %% ^abc\n  - b\n- c');
});

test('restore on open: a marker before a block id folds the item, and a block id alone does not (the control case)', () => {
  const marked = '- a %% fold %% ^abc\n  - b\n- [ ] c %% fold %% ^c-1\n  - d\n- e';
  const s = stateWith(marked, editorOver(marked), [indentFolding]);
  assert.deepEqual(
    foldsFromMarkers({ state: s }).map((e) => e.value),
    [
      { from: s.doc.line(1).to, to: s.doc.line(2).to },
      { from: s.doc.line(3).to, to: s.doc.line(4).to },
    ],
  );
  const plain = '- a ^abc\n  - b';
  assert.deepEqual(foldsFromMarkers({ state: stateWith(plain, editorOver(plain), [indentFolding]) }), []);
  const oldShape = '- a ^abc %% fold %%\n  - b';
  const o = stateWith(oldShape, editorOver(oldShape), [indentFolding]);
  assert.equal(foldsFromMarkers({ state: o }).length, 1, 'the shape an earlier build wrote still restores');
});

/* The scheme keymap, driven through a stub Editor over the state (see
   test/lib/scheme-cases.mjs): inside a list the key runs the operation,
   outside one it returns false so the editor's own key runs. */
for (const c of runSchemeCases(cm)) {
  test(`scheme keymap: ${c.name}`, () => {
    assert.equal(c.problem, null, c.problem ?? '');
  });
}
