/* The editor-layer surface that runs without a DOM: the two transaction
 * filters and the pairing door, over a real @codemirror/state. View
 * plugins and keymaps need an EditorView and stay a live-vault check; the
 * scheme keymap's handlers take a view-shaped object, so they run here
 * over a stub Editor that edits the state (test/lib/scheme-cases.mjs). */
export { cursorStick } from '../src/editor/cursorStick';
export { foldMarkers, foldsFromMarkers, ownFoldChange } from '../src/editor/foldMarkers';
export { ownEditor } from '../src/editor/registry';
export { performSchemeAction, schemeBindings } from '../src/editor/schemeKeymap';
export { DEFAULT_SETTINGS } from '../src/settings/model';
export { editorInfoField } from './obsidian-stub';
