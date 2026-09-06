/* Which CodeMirror view belongs to which Obsidian Editor, and the one door
 * from a state to its Editor. A command gets an Editor and nothing else,
 * and the fold effects need the view. Inside an extension the pairing is
 * public: `editorInfoField` names the Editor and the view plugin holds the
 * view. So every editor registers itself here as it comes up, and a
 * command looks its view up. A WeakMap, so a closed editor is forgotten
 * with its Editor object.
 *
 * The door checks the pairing (see pairing.ts): a Live Preview table cell
 * is a second view that carries the parent note's Editor, and it must
 * register nothing, or the parent's entry would point at the cell and,
 * once the cell closes, at a destroyed view. Every extension of this
 * plugin asks `ownEditor` and steps aside on null. */
import type { EditorState } from '@codemirror/state';
import { ViewPlugin } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import type { Editor } from 'obsidian';
import { paired } from './pairing';

const views = new WeakMap<Editor, EditorView>();

/* The Editor whose document this state is, or null: no editor yet (the
   view is still being built), or another document's Editor (a table
   cell). */
export function ownEditor(state: EditorState): Editor | null {
  const editor = state.field(editorInfoField, false)?.editor;
  return editor && paired(editor, state.doc) ? editor : null;
}

function remember(view: EditorView): Editor | null {
  const editor = ownEditor(view.state);
  if (editor) views.set(editor, view);
  return editor;
}

export const viewRegistry = ViewPlugin.define((view) => {
  let known = remember(view);
  return {
    update(update) {
      if (!known || update.startState.field(editorInfoField, false) !== update.state.field(editorInfoField, false)) known = remember(update.view);
    },
    destroy() {
      if (known && views.get(known) === view) views.delete(known);
    },
  };
});

/* The live view for an Editor; an entry whose view has left the DOM is
   dropped rather than returned. */
export function viewFor(editor: Editor): EditorView | null {
  const view = views.get(editor);
  if (!view) return null;
  if (!view.dom.isConnected) {
    views.delete(editor);
    return null;
  }
  return view;
}
