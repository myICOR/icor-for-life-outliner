/* The one door between an editor and the operations. A key handler or a
 * command names an action; this file runs the guards that apply to every
 * action (one selection, a list line by the syntax tree, a parseable list),
 * parses the list around the cursor, runs the operation, applies the tree
 * back and says whether the key is consumed. It has no idea what
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
  toggleDone,
} from './operations';
import type { OpContext, OpResult } from './operations';
import { CONSUMED } from './operations';
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

function operate(action: ActionId, tree: ListTree, ctx: OpContext, editor: OutlinerEditor): OpResult {
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
      if (item.hasChildren() && !item.folded) editor.fold(tree.lineOf(item));
      return CONSUMED;
    }
    case 'unfold': {
      const item = tree.selection.head.item;
      if (item.folded) editor.unfold(tree.lineOf(item));
      return CONSUMED;
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
  const result = operate(action, tree, { mode: settings.stickCursor }, editor);
  if (!result.updated) return { consume: result.consume, changed: false, reason: result.consume ? 'consumed' : 'passed by the operation' };
  const applied = applyTree(editor, tree, before);
  return { consume: result.consume, changed: applied.docChanged, reason: 'applied' };
}

/* Run a key's action only when its setting is on (keymaps). */
export function runKey(editor: OutlinerEditor, settings: OutlinerSettings, action: KeyAction): ActionOutcome {
  if (!keyEnabled(settings, action)) return pass('switched off in settings');
  return runAction(editor, settings, action);
}
