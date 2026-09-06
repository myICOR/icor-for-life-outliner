/* The editor-layer surface that runs without a DOM: the two transaction
 * filters and the pairing door, over a real @codemirror/state. View
 * plugins and keymaps need an EditorView and stay a live-vault check. */
export { cursorStick } from '../src/editor/cursorStick';
export { foldMarkers, foldsFromMarkers, ownFoldChange } from '../src/editor/foldMarkers';
export { ownEditor } from '../src/editor/registry';
export { editorInfoField } from './obsidian-stub';
