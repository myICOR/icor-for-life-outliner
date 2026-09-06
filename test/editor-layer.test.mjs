/* The transaction filters against a real EditorState. Each case builds a
 * state whose `editorInfoField` names an Editor, dispatches one
 * transaction, and reads the result. The Editor is a stub over a Text:
 * the same Text as the state's for a paired editor, another for the
 * parent-of-a-table-cell shape Flint found (H1). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EditorState, Text } from '@codemirror/state';
import { foldEffect } from '@codemirror/language';
import { cursorStick, editorInfoField, foldMarkers, ownEditor, ownFoldChange } from './build/cm.mjs';
import { DEFAULT_SETTINGS } from './build/pure.mjs';

function editorOver(text) {
  const doc = Text.of(text.split('\n'));
  return { lineCount: () => doc.lines, getLine: (n) => doc.line(n + 1).text };
}

function host(overrides = {}) {
  return { settings: { ...DEFAULT_SETTINGS, ...overrides }, log() {}, foldUnavailable() {}, registerDomEvent() {} };
}

function stateWith(doc, editor, extensions) {
  return EditorState.create({ doc, extensions: [editorInfoField.init(() => ({ editor })), ...extensions] });
}

const DOC = '- a\n  - b\n- c';

test('ownEditor: the Editor only when its document is the view\'s document', () => {
  const paired = stateWith(DOC, editorOver(DOC), []);
  assert.equal(ownEditor(paired), paired.field(editorInfoField).editor);
  const cellShape = stateWith('5', editorOver(DOC), []);
  assert.equal(ownEditor(cellShape), null, 'a table cell view with the parent note\'s Editor');
  const sameCountOtherText = stateWith('x\ny\nz', editorOver(DOC), []);
  assert.equal(ownEditor(sameCountOtherText), null);
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
