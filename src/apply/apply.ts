/* Tree back into the editor, in a fixed order: unfold what the change is
 * about to rewrite, replace the changed span with ONE edit, bring every
 * item's fold in line with the tree's own fold flags at the items' new
 * lines, then set the selection. Lines outside the list are never touched. */
import { printTree, samePosition } from '../model';
import type { ListTree, SelectionRange } from '../model';
import { computeChange } from './diff';
import type { OutlinerEditor } from './editor';

export interface ApplyOutcome {
  docChanged: boolean;
  selectionChanged: boolean;
}

/* Every item's fold flag against the editor's folds at the item's new line:
 * fold what the tree says is folded and the editor lost in the replacement,
 * unfold what an operation opened (a target that had to be unfolded so the
 * moved item stays visible). Lines that are not items are never touched. */
function reconcileFolds(editor: OutlinerEditor, tree: ListTree): void {
  const folded = new Set(editor.foldedLines());
  for (const item of tree.itemsInOrder()) {
    const line = tree.lineOf(item);
    if (item.folded && !folded.has(line)) editor.fold(line);
    else if (!item.folded && folded.has(line)) editor.unfold(line);
  }
}

export function applyTree(editor: OutlinerEditor, tree: ListTree, oldLines: readonly string[]): ApplyOutcome {
  const newLines = printTree(tree);
  const change = computeChange(oldLines, newLines, tree.startLine);
  if (change) {
    for (const line of editor.foldedLines()) {
      if (line >= change.oldStart && line <= change.oldEnd) editor.unfold(line);
    }
    editor.replaceRange(change.text, change.from, change.to);
  }
  reconcileFolds(editor, tree);

  const head = tree.absolute(tree.selection.head);
  const anchor = tree.selection.anchor ? tree.absolute(tree.selection.anchor) : head;
  const wanted: SelectionRange = { anchor, head };
  const current = editor.listSelections();
  const same = current.length === 1 && current[0] !== undefined && samePosition(current[0].anchor, wanted.anchor) && samePosition(current[0].head, wanted.head);
  if (!same) editor.setSelection(wanted);
  return { docChanged: change !== null, selectionChanged: !same };
}
