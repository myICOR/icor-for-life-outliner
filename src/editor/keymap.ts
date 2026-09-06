/* The keys. Tab, Shift-Tab and Enter must run before the editor's own list
 * handling, so they sit at the highest precedence, and each of them asks
 * the syntax tree first and steps aside on anything that is not a list
 * line: a table, a code block, a callout, frontmatter, a widget. The rest
 * (Backspace, Delete, Mod-Backspace on macOS, ArrowLeft, Mod-a, Shift-Up and
 * Shift-Down) run at the default precedence. Every handler returns false while an input method is
 * composing on desktop, so a composition is never cut in half. */
import { Prec } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import type { Command } from '@codemirror/view';
import { Platform, editorInfoField } from 'obsidian';
import { runKey } from '../actions';
import type { KeyAction } from '../settings/model';
import { CmEditorAdapter } from './adapter';
import type { EditorHost } from './host';
import { classifyNodeNames } from './nodes';
import { nodeNamesOnLine } from './syntax';

function handler(host: EditorHost, action: KeyAction, treeFirst: boolean): Command {
  return (view) => {
    if (Platform.isDesktop && view.composing) return false;
    if (treeFirst) {
      const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
      if (classifyNodeNames(nodeNamesOnLine(view.state, line)) === 'other') return false;
    }
    const editor = view.state.field(editorInfoField, false)?.editor;
    if (!editor) return false;
    const outcome = runKey(new CmEditorAdapter(editor, view, () => host.foldUnavailable()), host.settings, action);
    host.log(`${action}: ${outcome.reason}`);
    return outcome.consume;
  };
}

export function outlinerKeymaps(host: EditorHost): Extension[] {
  return [
    Prec.highest(
      keymap.of([
        { key: 'Tab', run: handler(host, 'indent', true) },
        { key: 'Shift-Tab', run: handler(host, 'outdent', true) },
        { key: 'Enter', run: handler(host, 'enter', true) },
      ]),
    ),
    keymap.of([
      { key: 'Backspace', run: handler(host, 'backspace', false) },
      { key: 'Delete', run: handler(host, 'delete', false) },
      { mac: 'Mod-Backspace', run: handler(host, 'delete-to-line-start', false) },
      { key: 'ArrowLeft', run: handler(host, 'arrow-left', false) },
      { win: 'Ctrl-ArrowLeft', linux: 'Ctrl-ArrowLeft', run: handler(host, 'arrow-left', false) },
      { key: 'Mod-a', run: handler(host, 'select-all', false) },
      { key: 'Shift-ArrowDown', run: handler(host, 'select-down', false) },
      { key: 'Shift-ArrowUp', run: handler(host, 'select-up', false) },
    ]),
  ];
}
