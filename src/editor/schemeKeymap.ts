/* The active keyboard scheme as a CodeMirror keymap, at the default
 * precedence (below the Enter family in keymap.ts, above core's own
 * keys, which are registered after plugin extensions). Every binding
 * runs the operation the command of the same id runs, and returns false
 * whenever the outliner has nothing to do, so the key falls through to
 * the editor: Mod+ArrowUp folds inside a list and goes to the start of
 * the note everywhere else. The tables are schemes.ts; the plugin swaps
 * the extension when the setting changes (main.ts). */
import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { EditorView, KeyBinding } from '@codemirror/view';
import { Platform } from 'obsidian';
import { runAction } from '../actions';
import { CmEditorAdapter } from './adapter';
import type { EditorHost } from './host';
import { ownEditor } from './registry';
import { schemeKeys } from './schemes';
import type { SchemeAction, SchemeId } from './schemes';

export type SchemePerform = (view: EditorView, action: SchemeAction) => boolean;

/* The bindings of a scheme over a performer; the performer is a
   parameter so the bindings can be tested without a DOM. */
export function schemeBindings(id: SchemeId, perform: SchemePerform): KeyBinding[] {
  return schemeKeys(id).map((k) => ({ key: k.key, mac: k.mac, run: (view) => perform(view, k.action) }));
}

export function schemeKeymap(id: SchemeId, host: EditorHost): Extension {
  return keymap.of(schemeBindings(id, (view, action) => performSchemeAction(host, view, action)));
}

/* False, so the key reaches the editor, while an input method is
   composing on desktop, in a view that is not its Editor's own (a table
   cell), and whenever the operation passed: the cursor is not in a list,
   or the list gave it nothing to do. */
export function performSchemeAction(host: EditorHost, view: EditorView, action: SchemeAction): boolean {
  if (Platform.isDesktop && view.composing) return false;
  const editor = ownEditor(view.state);
  if (!editor) return false;
  const adapter = new CmEditorAdapter(editor, view, () => host.foldUnavailable());
  if (action === 'move-to') return host.moveTo(adapter, view);
  const outcome = runAction(adapter, host.settings, action);
  host.log(`${action}: ${outcome.reason}`);
  return outcome.consume;
}
