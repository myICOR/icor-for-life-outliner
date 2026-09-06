/* What a command does with its chord when the outliner has nothing to do:
 * the editor's own behaviour for that chord, through the public API, so a
 * default hotkey takes nothing away outside a list. Obsidian's hotkey
 * layer listens on the window in the capture phase and consumes a bound
 * chord whether or not the command did anything (read in the 1.13.7
 * bundle: executeCommand returns true after checkCallback(false), and the
 * trigger then prevents default), so the editor's own keymap never sees
 * the key; the command has to do the editor's job itself. The six cases
 * are the six overlaps in src/commandTable.ts and nothing else. */
import { EditorSelection } from '@codemirror/state';
import type { SelectionRange } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Platform } from 'obsidian';
import type { Editor, EditorPosition } from 'obsidian';
import type { HandBack } from '../commandTable';

export function handBack(kind: HandBack, editor: Editor, view: EditorView): void {
  switch (kind) {
    case 'indent-more':
      editor.exec('indentMore');
      return;
    case 'indent-less':
      editor.exec('indentLess');
      return;
    case 'select-to-start':
      /* Cmd+Shift+ArrowUp is macOS's select to the start; Windows and
         Linux bind nothing to Ctrl+Shift+ArrowUp, so nothing is added. */
      if (Platform.isMacOS) selectTo(editor, { line: 0, ch: 0 });
      return;
    case 'select-to-end': {
      if (!Platform.isMacOS) return;
      const line = editor.lastLine();
      selectTo(editor, { line, ch: editor.getLine(line).length });
      return;
    }
    case 'cursor-above':
      addCursor(view, false);
      return;
    case 'cursor-below':
      addCursor(view, true);
      return;
  }
}

function selectTo(editor: Editor, head: EditorPosition): void {
  editor.setSelection(editor.getCursor('anchor'), head);
}

/* The editor's add-cursor-above and add-cursor-below: for every range,
   move vertically until the head leaves the range's line, and add that
   position as a cursor unless one is there already. The new cursor is the
   main one. */
function addCursor(view: EditorView, forward: boolean): void {
  const { state } = view;
  const ranges: SelectionRange[] = state.selection.ranges.slice();
  for (const range of state.selection.ranges) {
    const line = state.doc.lineAt(range.head);
    if (forward ? line.to >= state.doc.length : line.from <= 0) continue;
    let current = range;
    for (;;) {
      const next = view.moveVertically(current, forward);
      if (next.head < line.from || next.head > line.to) {
        if (!ranges.some((r) => r.head === next.head)) ranges.push(next);
        break;
      }
      if (next.head === current.head) break;
      current = next;
    }
  }
  if (ranges.length === state.selection.ranges.length) return;
  view.dispatch({ selection: EditorSelection.create(ranges, ranges.length - 1), scrollIntoView: true, userEvent: 'select' });
}
