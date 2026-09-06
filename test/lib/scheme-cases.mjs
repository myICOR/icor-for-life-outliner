/* The scheme keymap driven without a DOM: each case builds a state whose
 * `editorInfoField` names a stub Editor that edits that same state
 * through a view-shaped object (`state`, `composing`, `dispatch`), finds
 * the binding by its CodeMirror key name and runs it. Shared by
 * test/editor-layer.test.mjs and the mutation runner, so a guard broken
 * in src/editor/schemeKeymap.ts goes red in both. */
import { EditorState } from '@codemirror/state';
import { codeFolding, foldService, foldedRanges } from '@codemirror/language';

/* A stand-in for Obsidian's "Fold indent" service. */
const indentFolding = foldService.of((state, from, to) => {
  const line = state.doc.lineAt(from);
  const depth = line.text.search(/\S/);
  let end = line.number;
  for (let n = line.number + 1; n <= state.doc.lines; n++) {
    const next = state.doc.line(n);
    const d = next.text.search(/\S/);
    if (d === -1 || d > depth) end = n;
    else break;
  }
  return end > line.number ? { from: to, to: state.doc.line(end).to } : null;
});

/* An Obsidian Editor over a view: every read comes from the view's state
   and every write is a dispatch on it. */
function editorOver(ref) {
  const doc = () => ref.view.state.doc;
  const offset = (p) => doc().line(p.line + 1).from + p.ch;
  const position = (o) => {
    const l = doc().lineAt(o);
    return { line: l.number - 1, ch: o - l.from };
  };
  return {
    lineCount: () => doc().lines,
    lastLine: () => doc().lines - 1,
    getLine: (n) => (n < doc().lines ? doc().line(n + 1).text : ''),
    getCursor: (which) => {
      const m = ref.view.state.selection.main;
      return position(which === 'anchor' ? m.anchor : m.head);
    },
    listSelections: () => ref.view.state.selection.ranges.map((r) => ({ anchor: position(r.anchor), head: position(r.head) })),
    setSelection: (anchor, head) => ref.view.dispatch({ selection: { anchor: offset(anchor), head: offset(head ?? anchor) } }),
    replaceRange: (text, from, to) => ref.view.dispatch({ changes: { from: offset(from), to: offset(to ?? from), insert: text } }),
    transaction: (t) => ref.view.dispatch({ changes: t.changes.map((c) => ({ from: offset(c.from), to: offset(c.to), insert: c.text })) }),
  };
}

/* A view over `text` with the cursor at `cursor`; `editorDoc` names the
   document the Editor belongs to when it is not this one (a table cell). */
function viewOver(cm, text, cursor, editorDoc = null) {
  const ref = {};
  const editor = editorDoc === null ? editorOver(ref) : editorOver({ view: { state: EditorState.create({ doc: editorDoc }) } });
  const state = EditorState.create({
    doc: text,
    selection: { anchor: cursor },
    extensions: [cm.editorInfoField.init(() => ({ editor })), codeFolding(), indentFolding],
  });
  ref.view = {
    state,
    composing: false,
    dispatch(spec) {
      this.state = this.state.update(spec).state;
    },
  };
  return ref.view;
}

function host(cm) {
  return { settings: { ...cm.DEFAULT_SETTINGS }, log() {}, foldUnavailable() {}, moveTo: () => false, registerDomEvent() {} };
}

function bindingsOf(cm, scheme) {
  const h = host(cm);
  return cm.schemeBindings(scheme, (view, action) => cm.performSchemeAction(h, view, action));
}

function press(cm, scheme, key, view, platform = 'key') {
  const binding = bindingsOf(cm, scheme).find((b) => b[platform] === key);
  if (!binding) throw new Error(`${scheme} binds nothing to ${key} on ${platform}`);
  return binding.run(view);
}

const folds = (view) => {
  const out = [];
  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => out.push({ from, to }));
  return out;
};

/* Each case returns null or the problem. */
export const SCHEME_CASES = [
  {
    name: 'tana: Mod-ArrowUp on an item with children folds it',
    run(cm) {
      const view = viewOver(cm, '- a\n  - b\n- c', 2);
      if (press(cm, 'tana', 'Mod-ArrowUp', view) !== true) return 'the key was not consumed';
      const f = folds(view);
      if (f.length !== 1 || f[0].from !== 3 || f[0].to !== 9) return `folds ${JSON.stringify(f)}`;
      return null;
    },
  },
  {
    name: 'tana: Mod-ArrowUp outside a list returns false and changes nothing (passthrough)',
    run(cm) {
      const view = viewOver(cm, 'text\n- a\n  - b', 1);
      if (press(cm, 'tana', 'Mod-ArrowUp', view) !== false) return 'the key was consumed outside a list';
      if (view.state.doc.toString() !== 'text\n- a\n  - b' || folds(view).length !== 0) return 'the document or the folds changed';
      return null;
    },
  },
  {
    name: 'tana: Mod-Shift-ArrowUp moves the item up, with its children',
    run(cm) {
      const view = viewOver(cm, '- a\n- b\n  - c', 6);
      if (press(cm, 'tana', 'Mod-Shift-ArrowUp', view) !== true) return 'the key was not consumed';
      const text = view.state.doc.toString();
      if (text !== '- b\n  - c\n- a') return `document ${JSON.stringify(text)}`;
      const head = view.state.selection.main.head;
      if (head !== 2) return `cursor at ${head}`;
      return null;
    },
  },
  {
    name: 'tana: Mod-Shift-ArrowUp on a paragraph returns false (passthrough)',
    run(cm) {
      const view = viewOver(cm, 'para\n\n- a', 2);
      if (press(cm, 'tana', 'Mod-Shift-ArrowUp', view) !== false) return 'the key was consumed outside a list';
      if (view.state.doc.toString() !== 'para\n\n- a') return 'the document changed';
      return null;
    },
  },
  {
    name: 'tana: Mod-Enter toggles done on the item',
    run(cm) {
      const view = viewOver(cm, '- a\n- b', 2);
      if (press(cm, 'tana', 'Mod-Enter', view) !== true) return 'the key was not consumed';
      const text = view.state.doc.toString();
      if (text !== '- [x] a\n- b') return `document ${JSON.stringify(text)}`;
      return null;
    },
  },
  {
    name: 'tana: Mod-Enter on plain text returns false and changes nothing (passthrough)',
    run(cm) {
      const view = viewOver(cm, 'plain', 2);
      if (press(cm, 'tana', 'Mod-Enter', view) !== false) return 'the key was consumed outside a list';
      if (view.state.doc.toString() !== 'plain') return 'the document changed';
      return null;
    },
  },
  {
    name: 'tana: Mod-Shift-l, the second key for toggle done, does the same',
    run(cm) {
      const view = viewOver(cm, '- [x] a', 6);
      if (press(cm, 'tana', 'Mod-Shift-l', view) !== true) return 'the key was not consumed';
      const text = view.state.doc.toString();
      if (text !== '- [ ] a') return `document ${JSON.stringify(text)}`;
      return null;
    },
  },
  {
    name: 'tana: Ctrl-Mod-ArrowUp on macOS is Ctrl-Alt-ArrowUp elsewhere, and collapses every level',
    run(cm) {
      const view = viewOver(cm, '- a\n  - b\n    - c\n- d', 2);
      if (press(cm, 'tana', 'Ctrl-Mod-ArrowUp', view, 'mac') !== true) return 'the mac key was not consumed';
      if (folds(view).length !== 2) return `folds ${JSON.stringify(folds(view))}`;
      const again = viewOver(cm, '- a\n  - b\n    - c\n- d', 2);
      if (press(cm, 'tana', 'Ctrl-Alt-ArrowUp', again) !== true) return 'the other key was not consumed';
      if (folds(again).length !== 2) return `folds ${JSON.stringify(folds(again))}`;
      return null;
    },
  },
  {
    name: 'heptabase: Mod-d duplicates the item, and Tana binds nothing to Mod-d',
    run(cm) {
      const view = viewOver(cm, '- a\n  - b', 2);
      if (press(cm, 'heptabase', 'Mod-d', view) !== true) return 'the key was not consumed';
      const text = view.state.doc.toString();
      if (text !== '- a\n  - b\n- a\n  - b') return `document ${JSON.stringify(text)}`;
      if (bindingsOf(cm, 'tana').some((b) => b.key === 'Mod-d')) return 'Tana binds Mod-d';
      return null;
    },
  },
  {
    name: 'none: no key is bound',
    run(cm) {
      return bindingsOf(cm, 'none').length === 0 ? null : 'the empty scheme binds keys';
    },
  },
  {
    name: 'tana: a view that is not its Editor\'s own (a table cell) returns false',
    run(cm) {
      const view = viewOver(cm, '- a', 2, 'note line\n- a\n  - b');
      if (press(cm, 'tana', 'Mod-ArrowUp', view) !== false) return 'the key was consumed in a foreign view';
      return null;
    },
  },
];

export function runSchemeCases(cm) {
  return SCHEME_CASES.map((c) => {
    let problem;
    try {
      problem = c.run(cm);
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    }
    return { name: c.name, problem };
  });
}
