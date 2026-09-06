/* The fixture grammar and its runner.
 *
 *   === name of the case
 *   --- given [unit=tab|2|4] [stick=never|bullet-only|bullet-and-checkbox] [tab=off] [enter=off] [selectall=off] [select=off] [markers=on]
 *   lines of the document, with markers
 *   --- nodes <line> <node name> [<node name> ...]        (optional, repeatable)
 *   --- when key <Tab|Shift-Tab|Enter|Mod-Shift-Enter|Backspace|Delete|Mod-Backspace|ArrowLeft|Mod-a|Shift-Down|Shift-Up>
 *   --- when command <indent|outdent|move-up|move-down|fold|unfold|insert-above|delete-with-subtree|duplicate|expand-all|collapse-all|toggle-done>
 *   --- when move-to <zero-based line of the target heading or item>
 *   --- when drop <line of the dragged item> <before|after|child> <line of the target item>
 *   --- then [passthrough|consumed]
 *   lines of the expected document, with markers
 *
 * Markers: ‸ is the cursor; ⟨ and ⟩ are the anchor and the head of a
 * selection; a line ending in " ⊟" is a folded item. A line that is just ⏎
 * stands for an empty line at the end of a block, where a real empty line
 * would be read as padding. Blank lines at the end of a block are padding.
 *
 * `then` alone expects the key to be consumed. `then passthrough` expects
 * the key to reach the editor untouched, and the document unchanged.
 * `then consumed` is the explicit form of the default, for cases where
 * nothing changes but the key must still stop. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CURSOR = '‸';
const ANCHOR = '⟨';
const HEAD = '⟩';
const FOLD = ' ⊟';
const EMPTY = '⏎';

const KEY_ACTIONS = {
  Tab: 'indent',
  'Shift-Tab': 'outdent',
  Enter: 'enter',
  Backspace: 'backspace',
  Delete: 'delete',
  'Mod-Backspace': 'delete-to-line-start',
  ArrowLeft: 'arrow-left',
  'Mod-a': 'select-all',
  'Shift-Down': 'select-down',
  'Shift-Up': 'select-up',
  'Mod-Shift-Enter': 'insert-above',
};

const COMMANDS = new Set(['indent', 'outdent', 'move-up', 'move-down', 'fold', 'unfold', 'insert-above', 'delete-with-subtree', 'duplicate', 'expand-all', 'collapse-all', 'toggle-done']);

export function parseState(block) {
  const lines = [];
  const folds = [];
  const marks = { cursors: [], anchor: null, head: null };
  for (const raw of block) {
    let text = raw === EMPTY ? '' : raw;
    if (text.endsWith(FOLD)) {
      folds.push(lines.length);
      text = text.slice(0, -FOLD.length);
    }
    let clean = '';
    for (const ch of text) {
      if (ch === CURSOR) marks.cursors.push({ line: lines.length, ch: clean.length });
      else if (ch === ANCHOR) marks.anchor = { line: lines.length, ch: clean.length };
      else if (ch === HEAD) marks.head = { line: lines.length, ch: clean.length };
      else clean += ch;
    }
    lines.push(clean);
  }
  let selections;
  if (marks.anchor && marks.head) selections = [{ anchor: marks.anchor, head: marks.head }];
  else selections = marks.cursors.map((c) => ({ anchor: c, head: c }));
  return { lines, folds, selections };
}

export function renderState(lines, selections, folds) {
  const marksByLine = new Map();
  const put = (pos, glyph) => {
    const list = marksByLine.get(pos.line) ?? [];
    list.push({ ch: pos.ch, glyph });
    marksByLine.set(pos.line, list);
  };
  for (const s of selections) {
    if (s.anchor.line === s.head.line && s.anchor.ch === s.head.ch) put(s.head, CURSOR);
    else {
      put(s.anchor, ANCHOR);
      put(s.head, HEAD);
    }
  }
  const foldSet = new Set(folds);
  return lines
    .map((text, i) => {
      let out = text;
      const marks = (marksByLine.get(i) ?? []).sort((a, b) => b.ch - a.ch || (a.glyph === HEAD ? -1 : 1));
      for (const m of marks) out = out.slice(0, m.ch) + m.glyph + out.slice(m.ch);
      if (foldSet.has(i)) out += FOLD;
      return out;
    })
    .join('\n');
}

function trimPadding(block) {
  const out = [...block];
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}

export function parseFixtureFile(text, file) {
  const cases = [];
  let current = null;
  let block = null;
  for (const [index, line] of text.split('\n').entries()) {
    if (line.startsWith('=== ')) {
      current = { name: line.slice(4).trim(), file, line: index + 1, options: {}, given: [], nodes: [], when: null, expect: 'consumed', then: [] };
      cases.push(current);
      block = null;
    } else if (line.startsWith('--- given')) {
      for (const opt of line.slice(9).trim().split(/\s+/).filter(Boolean)) {
        const [k, v] = opt.split('=');
        current.options[k] = v ?? true;
      }
      block = current.given;
    } else if (line.startsWith('--- nodes ')) {
      const [n, ...names] = line.slice(10).trim().split(/\s+/);
      current.nodes.push({ line: Number(n), names });
    } else if (line.startsWith('--- when ')) {
      const [verb, ...rest] = line.slice(9).trim().split(/\s+/);
      current.when = { verb, arg: rest[0], rest };
      block = null;
    } else if (line.startsWith('--- then')) {
      const word = line.slice(8).trim();
      current.expect = word === '' ? 'consumed' : word;
      block = current.then;
    } else if (block) {
      block.push(line);
    }
  }
  for (const c of cases) {
    c.given = trimPadding(c.given);
    c.then = trimPadding(c.then);
    if (!c.when) throw new Error(`${file}:${c.line} "${c.name}" has no --- when`);
    if (!['consumed', 'passthrough'].includes(c.expect)) throw new Error(`${file}:${c.line} "${c.name}": unknown expectation "${c.expect}"`);
  }
  return cases;
}

export function loadFixtures(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.txt')) continue;
    out.push(...parseFixtureFile(readFileSync(join(dir, name), 'utf8'), name));
  }
  return out;
}

function unitOf(options) {
  const u = options.unit ?? '2';
  if (u === 'tab') return '\t';
  return ' '.repeat(Number(u));
}

/* Runs one case against a pure bundle. Returns null when it passes, else a
 * message that names what differed. */
export function runCase(pure, c) {
  const given = parseState(c.given);
  const editor = new pure.FakeEditor(given.lines, given.selections, unitOf(c.options));
  for (const f of given.folds) editor.folds.add(f);
  for (const n of c.nodes) editor.nodes.set(n.line, n.names);
  const settings = {
    ...pure.DEFAULT_SETTINGS,
    stickCursor: c.options.stick ?? pure.DEFAULT_SETTINGS.stickCursor,
    betterTab: c.options.tab !== 'off',
    betterEnter: c.options.enter !== 'off',
    selectAll: c.options.selectall !== 'off',
    selectItems: c.options.select !== 'off',
    foldMarkers: c.options.markers === 'on',
  };

  let outcome;
  if (c.when.verb === 'key') {
    const action = KEY_ACTIONS[c.when.arg];
    if (!action) return `unknown key ${c.when.arg}`;
    outcome = pure.runKey(editor, settings, action);
  } else if (c.when.verb === 'drop') {
    const [source, place, target] = c.when.rest;
    outcome = pure.runDrop(editor, settings, { sourceLine: Number(source), place, targetLine: Number(target) });
  } else if (c.when.verb === 'move-to') {
    outcome = pure.runMoveTo(editor, settings, Number(c.when.arg));
  } else if (c.when.verb === 'command') {
    if (!COMMANDS.has(c.when.arg)) return `unknown command ${c.when.arg}`;
    outcome = pure.runAction(editor, settings, c.when.arg);
  } else {
    return `unknown verb ${c.when.verb}`;
  }

  const wantConsume = c.expect === 'consumed';
  const problems = [];
  if (outcome.consume !== wantConsume) problems.push(`expected the key to be ${wantConsume ? 'consumed' : 'passed through'}, it was ${outcome.consume ? 'consumed' : 'passed through'} (${outcome.reason})`);
  const actual = renderState(editor.lines, editor.listSelections(), editor.foldedLines());
  const expected = c.then.map((l) => (l === EMPTY ? '' : l)).join('\n');
  if (actual !== expected) problems.push(`state differs\n--- expected\n${expected}\n--- actual\n${actual}`);
  if (editor.replaceCalls > 1) problems.push(`${editor.replaceCalls} replaceRange calls; the engine promises at most one`);
  return problems.length > 0 ? problems.join('\n') : null;
}
