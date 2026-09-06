/* The commands, no default hotkeys (the README suggests some), each with a
 * Lucide icon so it can sit on the mobile toolbar. A command is offered
 * only when the cursor is in a list; running one outside does nothing.
 * The view comes from the DOM of the MarkdownView when there is one (the
 * outer editor, even while a table cell is open) and from the registry
 * otherwise; either way it must be the Editor's own. */
import { EditorView } from '@codemirror/view';
import { MarkdownView, Notice } from 'obsidian';
import type { Editor, MarkdownFileInfo, Plugin } from 'obsidian';
import { runAction } from './actions';
import type { ActionId } from './actions';
import { CmEditorAdapter } from './editor/adapter';
import type { EditorHost } from './editor/host';
import { paired } from './editor/pairing';
import { viewFor } from './editor/registry';
import { MoveToModal } from './editor/moveToModal';
import { findListBounds } from './model';
import { moveTargets, runMoveTo } from './moveTo';

export interface CommandSpec {
  id: string;
  name: string;
  icon: string;
  action: ActionId;
}

export const COMMANDS: readonly CommandSpec[] = [
  { id: 'fold', name: 'Fold the list item', icon: 'chevrons-down-up', action: 'fold' },
  { id: 'unfold', name: 'Unfold the list item', icon: 'chevrons-up-down', action: 'unfold' },
  { id: 'move-up', name: 'Move the list item up', icon: 'arrow-up', action: 'move-up' },
  { id: 'move-down', name: 'Move the list item down', icon: 'arrow-down', action: 'move-down' },
  { id: 'indent', name: 'Indent the list item', icon: 'indent', action: 'indent' },
  { id: 'outdent', name: 'Outdent the list item', icon: 'outdent', action: 'outdent' },
  { id: 'insert-above', name: 'Insert a list item above', icon: 'list-plus', action: 'insert-above' },
  { id: 'delete-with-subtree', name: 'Delete the list item with its subtree', icon: 'trash', action: 'delete-with-subtree' },
  { id: 'duplicate', name: 'Duplicate the list item with its subtree', icon: 'copy', action: 'duplicate' },
  { id: 'expand-all', name: 'Expand all under the list item', icon: 'unfold-vertical', action: 'expand-all' },
  { id: 'collapse-all', name: 'Collapse all under the list item', icon: 'fold-vertical', action: 'collapse-all' },
  { id: 'toggle-done', name: 'Toggle done on the list item', icon: 'check', action: 'toggle-done' },
];

/* The one command with a picker: the targets come from the pure layer, the
   modal shows them, and the move runs only if the document is still the
   one the picker was opened on. */
export const MOVE_TO_COMMAND = { id: 'move-to', name: 'Move the list item to...', icon: 'corner-down-right' } as const;

const NOTHING_TO_MOVE_TO = 'No heading or list item to move to in this file.';
const CHANGED_MEANWHILE = 'The note changed while the picker was open; nothing was moved.';

function resolveView(editor: Editor, ctx: MarkdownView | MarkdownFileInfo): EditorView | null {
  if (ctx instanceof MarkdownView) {
    const view = EditorView.findFromDOM(ctx.contentEl);
    if (view && paired(editor, view.state.doc)) return view;
  }
  return viewFor(editor);
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
      const selection = adapter.listSelections()[0];
      if (!selection) return true;
      const targets = moveTargets(adapter, selection);
      if (targets.length === 0) {
        new Notice(NOTHING_TO_MOVE_TO);
        return true;
      }
      const doc = view.state.doc;
      new MoveToModal(plugin.app, targets, (target) => {
        if (!view.state.doc.eq(doc)) {
          new Notice(CHANGED_MEANWHILE);
          return;
        }
        const outcome = runMoveTo(adapter, host.settings, target.line);
        host.log(`${MOVE_TO_COMMAND.id}: ${outcome.reason}`);
      }).open();
      return true;
    },
  });
}
