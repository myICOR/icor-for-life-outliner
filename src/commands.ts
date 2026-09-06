/* The commands, registered from the table in commandTable.ts, each with a
 * Lucide icon so it can sit on the mobile toolbar and no default hotkey:
 * the keyboard schemes bind the same actions as editor keys that step
 * aside outside a list (schemeKeymap.ts), and a hotkey the user sets
 * under Settings, Hotkeys runs first and wins over the scheme. A command
 * is offered only when the cursor is in a list; running one outside does
 * nothing. The view comes from the DOM of the MarkdownView when there is
 * one (the outer editor, even while a table cell is open) and from the
 * registry otherwise; either way it must be the Editor's own. */
import { EditorView } from '@codemirror/view';
import { MarkdownView, Notice } from 'obsidian';
import type { App, Editor, MarkdownFileInfo, Plugin } from 'obsidian';
import { runAction } from './actions';
import type { OutlinerEditor } from './apply';
import { COMMANDS, MOVE_TO_COMMAND } from './commandTable';
import { CmEditorAdapter } from './editor/adapter';
import type { EditorHost } from './editor/host';
import { paired } from './editor/pairing';
import { viewFor } from './editor/registry';
import { MoveToModal } from './editor/moveToModal';
import { findListBounds } from './model';
import { moveTargets, runMoveTo } from './moveTo';

const NOTHING_TO_MOVE_TO = 'No heading or list item to move to in this file.';
const CHANGED_MEANWHILE = 'The note changed while the picker was open; nothing was moved.';

function resolveView(editor: Editor, ctx: MarkdownView | MarkdownFileInfo): EditorView | null {
  if (ctx instanceof MarkdownView) {
    const view = EditorView.findFromDOM(ctx.contentEl);
    if (view && paired(editor, view.state.doc)) return view;
  }
  return viewFor(editor);
}

/* The picker: the targets come from the pure layer, the modal shows
   them, and the move runs only if the document is still the one the
   picker was opened on. False when the cursor is not in a list. Shared
   by the command and the scheme key. */
export function openMoveTo(app: App, host: EditorHost, editor: OutlinerEditor, view: EditorView): boolean {
  const selection = editor.listSelections()[0];
  if (!selection || findListBounds(editor, selection.head.line) === null) return false;
  const targets = moveTargets(editor, selection);
  if (targets.length === 0) {
    new Notice(NOTHING_TO_MOVE_TO);
    return true;
  }
  const doc = view.state.doc;
  new MoveToModal(app, targets, (target) => {
    if (!view.state.doc.eq(doc)) {
      new Notice(CHANGED_MEANWHILE);
      return;
    }
    const outcome = runMoveTo(editor, host.settings, target.line);
    host.log(`${MOVE_TO_COMMAND.id}: ${outcome.reason}`);
  }).open();
  return true;
}

export function registerCommands(plugin: Plugin, host: EditorHost): void {
  for (const spec of COMMANDS) {
    plugin.addCommand({
      id: spec.id,
      name: spec.name,
      icon: spec.icon,
      editorCheckCallback: (checking, editor, ctx) => {
        const view = resolveView(editor, ctx);
        if (!view) return false;
        const adapter = new CmEditorAdapter(editor, view, () => host.foldUnavailable());
        if (checking) return findListBounds(adapter, editor.getCursor().line) !== null;
        const outcome = runAction(adapter, host.settings, spec.action);
        host.log(`${spec.id}: ${outcome.reason}`);
        return true;
      },
    });
  }

  plugin.addCommand({
    id: MOVE_TO_COMMAND.id,
    name: MOVE_TO_COMMAND.name,
    icon: MOVE_TO_COMMAND.icon,
    editorCheckCallback: (checking, editor, ctx) => {
      const view = resolveView(editor, ctx);
      if (!view) return false;
      const adapter = new CmEditorAdapter(editor, view, () => host.foldUnavailable());
      if (checking) return findListBounds(adapter, editor.getCursor().line) !== null;
      openMoveTo(plugin.app, host, adapter, view);
      return true;
    },
  });
}
