/* Which CodeMirror view belongs to which Obsidian Editor. A command gets
 * an Editor and nothing else, and the fold effects need the view. Inside
 * an extension the pairing is public: `editorInfoField` names the Editor
 * and the view plugin holds the view. So every editor registers itself
 * here as it comes up, and a command looks its view up. A WeakMap, so a
 * closed editor is forgotten with its Editor object. */
import { ViewPlugin } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';
import { editorInfoField } from 'obsidian';
import type { Editor } from 'obsidian';

const views = new WeakMap<Editor, EditorView>();

function remember(view: EditorView): boolean {
  const editor = view.state.field(editorInfoField, false)?.editor;
  if (!editor) return false;
  views.set(editor, view);
  return true;
}

export const viewRegistry = ViewPlugin.define((view) => {
  let known = remember(view);
  return {
    update(update) {
      if (!known || update.startState.field(editorInfoField, false) !== update.state.field(editorInfoField, false)) known = remember(update.view);
    },
  };
});

export function viewFor(editor: Editor): EditorView | null {
  return views.get(editor) ?? null;
}
