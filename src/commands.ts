/* The commands, registered from the table in commandTable.ts, each with a
 * Lucide icon so it can sit on the mobile toolbar and a default hotkey the
 * user can change under Settings, Hotkeys. A command is offered only when
 * the cursor is in a list; run from its hotkey outside a list it does
 * what the editor does with that chord (handBack.ts) or nothing. The view
 * comes from the DOM of the MarkdownView when there is one (the outer
 * editor, even while a table cell is open) and from the registry
 * otherwise; either way it must be the Editor's own. */
import { EditorView } from '@codemirror/view';
import { MarkdownView, Notice } from 'obsidian';
import type { Editor, Hotkey as ObsidianHotkey, MarkdownFileInfo, Plugin } from 'obsidian';
import { runAction } from './actions';
import { COMMANDS, MOVE_TO_COMMAND } from './commandTable';
import type { Hotkey } from './commandTable';
import { CmEditorAdapter } from './editor/adapter';
import { handBack } from './editor/handBack';
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

/* A fresh copy for Obsidian, which may keep and mutate what it is handed. */
function defaultHotkeys(hotkey: Hotkey): ObsidianHotkey[] {
  return [{ modifiers: [...hotkey.modifiers], key: hotkey.key }];
}

export function registerCommands(plugin: Plugin, host: EditorHost): void {
  for (const spec of COMMANDS) {
    plugin.addCommand({
      id: spec.id,
      name: spec.name,
      icon: spec.icon,
      hotkeys: defaultHotkeys(spec.hotkey),
      editorCheckCallback: (checking, editor, ctx) => {
        const view = resolveView(editor, ctx);
        if (!view) return false;
        const adapter = new CmEditorAdapter(editor, view, () => host.foldUnavailable());
        if (checking) return findListBounds(adapter, editor.getCursor().line) !== null;
        const outcome = runAction(adapter, host.settings, spec.action);
        host.log(`${spec.id}: ${outcome.reason}`);
        if (!outcome.consume && spec.handBack) handBack(spec.handBack, editor, view);
        return true;
      },
    });
  }

  plugin.addCommand({
    id: MOVE_TO_COMMAND.id,
    name: MOVE_TO_COMMAND.name,
    icon: MOVE_TO_COMMAND.icon,
    hotkeys: defaultHotkeys(MOVE_TO_COMMAND.hotkey),
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
