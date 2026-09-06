/* The commands, no default hotkeys (the README suggests some), each with a
 * Lucide icon so it can sit on the mobile toolbar. A command is offered
 * only when the cursor is in a list; running one outside does nothing. */
import { EditorView } from '@codemirror/view';
import { MarkdownView } from 'obsidian';
import type { Editor, MarkdownFileInfo, Plugin } from 'obsidian';
import { runAction } from './actions';
import type { ActionId } from './actions';
import { CmEditorAdapter } from './editor/adapter';
import type { EditorHost } from './editor/host';
import { viewFor } from './editor/registry';
import { findListBounds } from './model';

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

function resolveView(editor: Editor, ctx: MarkdownView | MarkdownFileInfo): EditorView | null {
  return viewFor(editor) ?? (ctx instanceof MarkdownView ? EditorView.findFromDOM(ctx.contentEl) : null);
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
}
