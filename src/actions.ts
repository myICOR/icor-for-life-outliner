/* The one door between an editor and the operations. A key handler or a
 * command names an action; this file runs the guards that apply to every
 * action (one selection, a list line by the syntax tree, a parseable list),
 * parses the list around the cursor, runs the operation, brings the fold
 * markers in step when the file remembers folds, applies the tree back
 * and says whether the key is consumed. It has no idea what
 * CodeMirror is, which is what makes the whole thing testable. */
import { applyTree } from './apply';
import type { OutlinerEditor } from './apply';
import { classifyNodeNames } from './editor/nodes';
import { parseList, printTree } from './model';
import type { ListTree } from './model';
import {
  collapseAll,
  createItem,
  deleteTillLineStart,
  deleteWithSubtree,
  dropItem,
  duplicate,
  expandAll,
  insertAbove,
  deleteTillNextStart,
  deleteTillPreviousEnd,
  indent,
  moveDown,
  moveToPreviousLineEnd,
  moveUp,
  outdent,
  outdentIfEmpty,
  selectAll,
  selectDown,
  selectUp,
  syncFoldMarkers,
  toggleDone,
} from './operations';
import type { DropPlace, OpContext, OpResult } from './operations';
import { CONSUMED, UPDATED } from './operations';
import { keyEnabled } from './settings/model';
import type { KeyAction, OutlinerSettings } from './settings/model';

export type ActionId = KeyAction | 'move-up' | 'move-down' | 'fold' | 'unfold' | 'delete-with-subtree' | 'duplicate' | 'expand-all' | 'collapse-all' | 'toggle-done';

export interface ActionOutcome {
  consume: boolean;
  changed: boolean;
  /* Why nothing happened, for the debug log. */
  reason: string;
}

function pass(reason: string): ActionOutcome {
  return { consume: false, changed: false, reason };
}

function operate(action: ActionId, tree: ListTree, ctx: OpContext): OpResult {
  switch (action) {
    case 'indent':
      return indent(tree);
    case 'outdent':
      return outdent(tree);
    case 'enter': {
      const first = outdentIfEmpty(tree);
      return first.updated ? first : createItem(tree);
    }
    case 'backspace':
      return deleteTillPreviousEnd(tree, ctx);
    case 'delete':
      return deleteTillNextStart(tree);
    case 'delete-to-line-start':
      return deleteTillLineStart(tree, ctx);
    case 'arrow-left':
      return moveToPreviousLineEnd(tree, ctx);
    case 'select-all':
      return selectAll(tree, ctx);
    case 'select-down':
      return selectDown(tree);
    case 'select-up':
      return selectUp(tree);
    case 'insert-above':
      return insertAbove(tree);
    case 'delete-with-subtree':
      return deleteWithSubtree(tree, ctx);
    case 'duplicate':
      return duplicate(tree, ctx);
    case 'expand-all':
      return expandAll(tree);
    case 'collapse-all':
      return collapseAll(tree);
    case 'toggle-done':
      return toggleDone(tree);
    case 'move-up':
      return moveUp(tree);
    case 'move-down':
      return moveDown(tree);
    case 'fold': {
      const item = tree.selection.head.item;
      if (!item.hasChildren() || item.folded) return CONSUMED;
      item.folded = true;
      return UPDATED;
    }
    case 'unfold': {
      const item = tree.selection.head.item;
      if (!item.folded) return CONSUMED;
      item.folded = false;
      return UPDATED;
    }
    default:
      return CONSUMED;
  }
}

/* Run an action regardless of settings (commands). */
export function runAction(editor: OutlinerEditor, settings: OutlinerSettings, action: ActionId): ActionOutcome {
  const selections = editor.listSelections();
  const selection = selections[0];
  if (selections.length !== 1 || !selection) return pass('one selection at a time');
  if (classifyNodeNames(editor.nodeNamesAt(selection.head.line)) === 'other') return pass('not a list line');
  const parsed = parseList(editor, selection.head.line, { foldedLines: editor.foldedLines(), indentUnit: editor.indentUnit(), selection });
  if (!parsed.ok) return pass(parsed.reason);
  const tree = parsed.tree;
  const before = printTree(tree);
  const result = operate(action, tree, { mode: settings.stickCursor });
  if (!result.updated) return { consume: result.consume, changed: false, reason: result.consume ? 'consumed' : 'passed by the operation' };
  if (settings.foldMarkers) syncFoldMarkers(tree);
  const applied = applyTree(editor, tree, before);
  return { consume: result.consume, changed: applied.docChanged, reason: 'applied' };
}

export interface DropSpec {
  /* Any line of the dragged item; the item's own subtree goes with it. */
  sourceLine: number;
  /* The bullet line of the target item, in the same list. */
  targetLine: number;
  place: DropPlace;
}

/* A drop is a move whose two ends come from the pointer, not from the
 * cursor: the list is parsed around the dragged line, and the cursor ends
 * up on the moved item. */
export function runDrop(editor: OutlinerEditor, settings: OutlinerSettings, spec: DropSpec): ActionOutcome {
  if (classifyNodeNames(editor.nodeNamesAt(spec.sourceLine)) === 'other') return pass('not a list line');
  const at = { line: spec.sourceLine, ch: 0 };
  const parsed = parseList(editor, spec.sourceLine, { foldedLines: editor.foldedLines(), indentUnit: editor.indentUnit(), selection: { anchor: at, head: at } });
  if (!parsed.ok) return pass(parsed.reason);
  const tree = parsed.tree;
  const source = tree.locateLine(spec.sourceLine);
  const target = tree.locateLine(spec.targetLine);
  if (!source) return pass('the dragged line is not in the list');
  if (!target || target.lineIndex !== 0) return { consume: true, changed: false, reason: 'the target is not an item of this list' };
  const before = printTree(tree);
  const result = dropItem(tree, source.item, target.item, spec.place, { mode: settings.stickCursor });
  if (!result.updated) return { consume: true, changed: false, reason: 'refused' };
  if (settings.foldMarkers) syncFoldMarkers(tree);
  const applied = applyTree(editor, tree, before);
  return { consume: true, changed: applied.docChanged, reason: 'applied' };
}

/* Run a key's action only when its setting is on (keymaps). */
export function runKey(editor: OutlinerEditor, settings: OutlinerSettings, action: KeyAction): ActionOutcome {
  if (!keyEnabled(settings, action)) return pass('switched off in settings');
  return runAction(editor, settings, action);
}
