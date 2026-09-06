/* The pure layer under the fixtures: line grammar, parser and printer round
 * trips, the line diff, the cursor rules, the node classifier, settings. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBulletLine, lineKind, orderedBullet, isMixedIndentation,
  parseList, printTree, findListBounds,
  computeChange,
  keepCursorInContent, keepCursorOutsideFolded, contentStartOfLine,
  classifyNodeNames,
  DEFAULT_SETTINGS, normaliseSettings, keyEnabled, SETTING_ROWS, settingKeys, rowsIn, groupsShown, SETTING_GROUPS, ALL_COMMANDS, EDITING_KEYS,
  FakeEditor,
} from './build/pure.mjs';

const cursor = (line, ch = 0) => ({ anchor: { line, ch }, head: { line, ch } });

function roundTrip(lines, cursorLine, folded = []) {
  const editor = new FakeEditor(lines, [cursor(cursorLine)]);
  const parsed = parseList(editor, cursorLine, { foldedLines: folded, indentUnit: '  ', selection: cursor(cursorLine) });
  return parsed;
}

test('bullet lines: markers, gaps, boxes', () => {
  assert.deepEqual(parseBulletLine('- a'), { indent: '', bullet: '-', bulletGap: ' ', checkbox: null, checkboxGap: '', content: 'a' });
  assert.deepEqual(parseBulletLine('\t* [x]  done'), { indent: '\t', bullet: '*', bulletGap: ' ', checkbox: '[x]', checkboxGap: '  ', content: 'done' });
  assert.deepEqual(parseBulletLine('  12) x'), { indent: '  ', bullet: '12)', bulletGap: ' ', checkbox: null, checkboxGap: '', content: 'x' });
  assert.deepEqual(parseBulletLine('-'), { indent: '', bullet: '-', bulletGap: '', checkbox: null, checkboxGap: '', content: '' });
  assert.deepEqual(parseBulletLine('- [ ]'), { indent: '', bullet: '-', bulletGap: ' ', checkbox: '[ ]', checkboxGap: '', content: '' });
  assert.equal(parseBulletLine('-[x] no'), null, 'a box needs a gap after the marker');
  assert.equal(parseBulletLine('-item'), null);
  assert.equal(parseBulletLine('1.5 is a number'), null);
  assert.equal(parseBulletLine('- [xx] not a box')?.checkbox, null);
  assert.equal(lineKind(''), 'blank');
  assert.equal(lineKind('   '), 'blank');
  assert.equal(lineKind('  note'), 'indented');
  assert.equal(lineKind('# heading'), 'other');
  assert.equal(lineKind('> quote'), 'other');
  assert.deepEqual(orderedBullet('3.'), { number: 3, close: '.' });
  assert.deepEqual(orderedBullet('10)'), { number: 10, close: ')' });
  assert.equal(orderedBullet('-'), null);
});

test('mixed indentation is a tab and a space in one list, or in one indent', () => {
  assert.equal(isMixedIndentation(['', '  ', '    ']), false);
  assert.equal(isMixedIndentation(['', '\t', '\t\t']), false);
  assert.equal(isMixedIndentation(['', '\t', '  ']), true);
  assert.equal(isMixedIndentation(['', ' \t']), true);
  assert.equal(isMixedIndentation([]), false);
});

const CORPUS = [
  ['two spaces', ['- a', '  - b', '    - c', '  - d', '- e']],
  ['four spaces', ['- a', '    - b', '        - c', '- d']],
  ['tabs', ['- a', '\t- b', '\t\t- c', '\t- d']],
  ['notes and blanks', ['- a', '  note one', '', '  note two', '- b', '', '- c']],
  ['boxes and numbers', ['1. [ ] a', '   2) [x] b', '   3. c', '2. d']],
  ['odd gaps', ['-\ta', '-  b', '-', '- [ ]', '  -   c']],
  ['uneven depth', ['- a', '   - b', '  - c', '- d']],
  ['fence in notes', ['- a', '  ```', '  code', '  ```', '- b']],
];

for (const [name, lines] of CORPUS) {
  test(`round trip: ${name}`, () => {
    for (let n = 0; n < lines.length; n++) {
      if (lineKind(lines[n]) === 'blank') continue;
      const parsed = roundTrip(lines, n);
      assert.equal(parsed.ok, true, `line ${n}: ${parsed.reason}`);
      assert.deepEqual(printTree(parsed.tree), lines, `from line ${n}`);
      assert.equal(parsed.tree.startLine, 0);
    }
  });
}

test('round trip keeps the surrounding document out of the tree', () => {
  const doc = ['# Title', '', '- a', '  - b', '- c', '', 'paragraph', '- d'];
  const parsed = roundTrip(doc, 3);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.tree.startLine, 2);
  assert.equal(parsed.tree.endLine, 4);
  assert.deepEqual(printTree(parsed.tree), ['- a', '  - b', '- c']);
  assert.deepEqual(findListBounds(new FakeEditor(doc, []), 7), { start: 7, end: 7 });
  assert.equal(findListBounds(new FakeEditor(doc, []), 6), null);
  assert.equal(findListBounds(new FakeEditor(doc, []), 5), null);
});

test('mixed tab and space indentation is rejected', () => {
  const parsed = roundTrip(['- a', '\t- b', '- c', '  - d'], 3);
  assert.deepEqual(parsed, { ok: false, reason: 'mixed-indentation' });
  const fine = roundTrip(['- a', '\t- b', '\t\tcode with  spaces', '- c'], 3);
  assert.equal(fine.ok, true, 'spaces inside a notes line are not indentation');
});

test('folds are read onto the items', () => {
  const parsed = roundTrip(['- a', '  - b', '- c'], 0, [0]);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.tree.items[0].folded, true);
  assert.equal(parsed.tree.items[1].folded, false);
  assert.equal(parsed.tree.isHidden(parsed.tree.items[0].children[0]), true);
});

test('the tree knows its lines', () => {
  const parsed = roundTrip(['- a', '  note', '  - b', '- c'], 0);
  const t = parsed.tree;
  const [a, c] = t.items;
  const b = a.children[0];
  assert.equal(t.lineOf(a), 0);
  assert.equal(t.lineOf(b), 2);
  assert.equal(t.lineOf(c), 3);
  assert.deepEqual(t.locateLine(1), { item: a, lineIndex: 1 });
  assert.equal(t.locateLine(4), null);
  assert.equal(a.level, 1);
  assert.equal(b.level, 2);
  assert.equal(a.subtreeLineCount(), 3);
  assert.equal(a.lastDescendant(), b);
  assert.equal(t.previousInOrder(c), b);
  assert.equal(t.nextInOrder(a), b);
  assert.equal(a.contentStart('bullet-and-checkbox'), 2);
  assert.equal(a.lineContentStart(1, 'bullet-and-checkbox'), 2);
});

test('computeChange trims the common head and tail', () => {
  assert.equal(computeChange(['a', 'b'], ['a', 'b'], 5), null);
  assert.deepEqual(computeChange(['a', 'b', 'c'], ['a', 'B', 'c'], 5), {
    from: { line: 6, ch: 0 }, to: { line: 6, ch: 1 }, text: 'B', oldStart: 6, oldEnd: 6, newStart: 6, newEnd: 6,
  });
  assert.deepEqual(computeChange(['a', 'b'], ['a', 'x', 'b'], 0), {
    from: { line: 1, ch: 0 }, to: { line: 1, ch: 0 }, text: 'x\n', oldStart: 1, oldEnd: 0, newStart: 1, newEnd: 1,
  });
  assert.deepEqual(computeChange(['a'], ['a', 'x'], 0), {
    from: { line: 0, ch: 1 }, to: { line: 0, ch: 1 }, text: '\nx', oldStart: 1, oldEnd: 0, newStart: 1, newEnd: 1,
  });
  assert.deepEqual(computeChange(['a', 'b', 'c'], ['a', 'c'], 0), {
    from: { line: 1, ch: 0 }, to: { line: 2, ch: 0 }, text: '', oldStart: 1, oldEnd: 1, newStart: 1, newEnd: 0,
  });
  assert.deepEqual(computeChange(['a', 'bb'], ['a'], 0), {
    from: { line: 0, ch: 1 }, to: { line: 1, ch: 2 }, text: '', oldStart: 1, oldEnd: 1, newStart: 1, newEnd: 0,
  });
  assert.deepEqual(computeChange(['a', 'b', 'c'], ['a', 'B', 'C2', 'c'], 0), {
    from: { line: 1, ch: 0 }, to: { line: 1, ch: 1 }, text: 'B\nC2', oldStart: 1, oldEnd: 1, newStart: 1, newEnd: 2,
  });
});

test('the fake editor applies every change shape the diff produces', () => {
  const shapes = [
    [['a', 'b', 'c'], ['a', 'B', 'c']],
    [['a', 'b'], ['a', 'x', 'b']],
    [['a'], ['a', 'x']],
    [['a', 'b', 'c'], ['a', 'c']],
    [['a', 'bb'], ['a']],
    [['a', 'b', 'c'], ['a', 'B', 'C2', 'c']],
    [['a'], ['x', 'a']],
    [['a', 'b'], ['b']],
  ];
  for (const [before, after] of shapes) {
    const editor = new FakeEditor(before, [cursor(0)]);
    const change = computeChange(before, after, 0);
    editor.replaceRange(change.text, change.from, change.to);
    assert.deepEqual(editor.lines, after, `${before.join('|')} to ${after.join('|')}`);
  }
});

test('cursor rules: content start per mode, notes lines, folded lines', () => {
  const editor = new FakeEditor(['- [ ] a', '  note', '    - b', 'para', '  code'], []);
  assert.equal(contentStartOfLine(editor, 0, 'bullet-and-checkbox'), 6);
  assert.equal(contentStartOfLine(editor, 0, 'bullet-only'), 2);
  assert.equal(contentStartOfLine(editor, 1, 'bullet-and-checkbox'), 2);
  assert.equal(contentStartOfLine(editor, 3, 'bullet-and-checkbox'), null);
  assert.equal(contentStartOfLine(editor, 4, 'bullet-and-checkbox'), null, 'indented under a paragraph is not a notes line');
  assert.deepEqual(keepCursorInContent(editor, { line: 0, ch: 3 }, 'bullet-and-checkbox'), { line: 0, ch: 6 });
  assert.equal(keepCursorInContent(editor, { line: 0, ch: 3 }, 'bullet-only'), null);
  assert.equal(keepCursorInContent(editor, { line: 0, ch: 0 }, 'never'), null);
  assert.equal(keepCursorInContent(editor, { line: 0, ch: 7 }, 'bullet-and-checkbox'), null);
  const hidden = [{ root: 0, start: 1, end: 2 }];
  assert.deepEqual(keepCursorOutsideFolded(editor, hidden, { line: 2, ch: 3 }), { line: 0, ch: 7 });
  assert.equal(keepCursorOutsideFolded(editor, hidden, { line: 0, ch: 7 }), null);
  assert.equal(keepCursorOutsideFolded(editor, hidden, { line: 3, ch: 0 }), null);
});

test('node names: list needs the list-line class, a parsed line without it is other, an empty set is unknown', () => {
  /* Names as Obsidian 1.13.7 builds them: line classes and token classes
     each sorted and joined with underscores (Flint's table, review of
     phase 1). One assertion per construct. */
  const list = 'HyperMD-list-line_HyperMD-list-line-1';
  assert.equal(classifyNodeNames([list, 'formatting_formatting-list_formatting-list-ul_list-1', 'list-1']), 'list', 'a bullet line');
  assert.equal(classifyNodeNames(['HyperMD-list-line_HyperMD-list-line-1_HyperMD-task-line', 'formatting_formatting-task_meta']), 'list', 'a task line');
  assert.equal(classifyNodeNames(['HyperMD-list-line_HyperMD-list-line-2_HyperMD-list-line-nobullet', 'hmd-list-indent_hmd-list-indent-2', 'list-2']), 'list', 'a continuation line');
  assert.equal(classifyNodeNames([list, 'formatting_formatting-math_formatting-math-begin', 'math', 'formatting_formatting-math_formatting-math-end_math-']), 'list', 'inline math on a bullet line');
  assert.equal(classifyNodeNames([list, 'inline-code']), 'list', 'inline code on a bullet line');
  assert.equal(classifyNodeNames(['formatting_formatting-list_formatting-list-ul_list-1', 'list-1']), 'other', 'list tokens without the line class are not a list line');
  assert.equal(classifyNodeNames(['HyperMD-codeblock_HyperMD-codeblock-begin_HyperMD-codeblock-begin-bg_HyperMD-codeblock-bg', 'formatting_formatting-code-block_hmd-codeblock']), 'other', 'a fence');
  assert.equal(classifyNodeNames(['HyperMD-codeblock_HyperMD-codeblock-bg', 'hmd-codeblock']), 'other', 'a fenced code body line');
  assert.equal(classifyNodeNames(['HyperMD-codeblock_HyperMD-codeblock-bg_HyperMD-list-line_HyperMD-list-line-1_HyperMD-list-line-nobullet', 'hmd-codeblock']), 'other', 'a fence inside an item is a fence');
  assert.equal(classifyNodeNames(['hmd-indented-code']), 'other', 'indented code');
  assert.equal(classifyNodeNames(['HyperMD-table-2_HyperMD-table-row_HyperMD-table-row-1', 'hmd-table-sep_hmd-table-sep-0']), 'other', 'a table row');
  assert.equal(classifyNodeNames(['hmd-frontmatter_meta']), 'other', 'frontmatter');
  assert.equal(classifyNodeNames(['hmd-frontmatter']), 'other', 'a frontmatter body line');
  assert.equal(classifyNodeNames(['HyperMD-callout_HyperMD-quote_HyperMD-quote-1', 'hmd-callout_quote_quote-1']), 'other', 'a callout head');
  assert.equal(classifyNodeNames(['HyperMD-quote_HyperMD-quote-1', 'quote_quote-1']), 'other', 'a quote or callout body line');
  assert.equal(classifyNodeNames(['HyperMD-quote_HyperMD-quote-1', list]), 'other', 'a list inside a quote');
  assert.equal(classifyNodeNames(['hmd-html-begin_tag']), 'other', 'an HTML block start');
  assert.equal(classifyNodeNames(['tag', 'attribute', 'string']), 'other', 'an HTML block interior');
  assert.equal(classifyNodeNames(['hmd-html-end']), 'other', 'an HTML block end');
  assert.equal(classifyNodeNames(['formatting_formatting-math_formatting-math-begin_math-block']), 'other', 'a math block fence');
  assert.equal(classifyNodeNames(['math', 'math_keyword']), 'other', 'a math block interior');
  assert.equal(classifyNodeNames(['formatting_formatting-math_formatting-math-end_math-']), 'other', 'a math block end');
  assert.equal(classifyNodeNames(['HyperMD-header_HyperMD-header-2', 'formatting_formatting-header_formatting-header-2_header_header-2', 'header_header-2']), 'heading', 'a heading');
  assert.equal(classifyNodeNames(['HyperMD-header_HyperMD-header-1', 'HyperMD-quote_HyperMD-quote-1', 'header_header-1']), 'other', 'a heading inside a quote');
  assert.equal(classifyNodeNames(['inline-code']), 'other', 'a paragraph with inline code is parsed and not a list');
  assert.equal(classifyNodeNames(['em', 'strong']), 'other', 'a paragraph with emphasis');
  assert.equal(classifyNodeNames([]), 'unknown', 'an unparsed line');
  assert.equal(classifyNodeNames(['Document']), 'unknown', 'the top node alone says nothing');
});

test('settings: defaults, normalisation, key gates, one row per key', () => {
  assert.deepEqual(normaliseSettings(undefined), DEFAULT_SETTINGS);
  assert.deepEqual(normaliseSettings({ stickCursor: 'sideways', betterTab: 'yes', debug: true }), { ...DEFAULT_SETTINGS, debug: true });
  assert.equal(normaliseSettings({ stickCursor: 'never' }).stickCursor, 'never');
  assert.equal(keyEnabled({ ...DEFAULT_SETTINGS, stickCursor: 'never' }, 'backspace'), false);
  assert.equal(keyEnabled({ ...DEFAULT_SETTINGS, stickCursor: 'never' }, 'indent'), true);
  assert.equal(keyEnabled({ ...DEFAULT_SETTINGS, betterEnter: false }, 'enter'), false);
  assert.deepEqual([...settingKeys()].sort(), Object.keys(DEFAULT_SETTINGS).sort());
  assert.equal(new Set(settingKeys()).size, SETTING_ROWS.length);
  for (const row of SETTING_ROWS) assert.ok(row.name === row.name.charAt(0).toUpperCase() + row.name.slice(1), `${row.name} starts with a capital`);
});

test('settings: the two read-only groups list every command and every editing key, for either platform', () => {
  assert.deepEqual(SETTING_GROUPS, ['Cursor', 'Keys', 'Mouse', 'Folds', 'Keyboard shortcuts', 'Editing keys', 'Advanced']);
  assert.deepEqual(groupsShown(true), SETTING_GROUPS);
  assert.deepEqual(groupsShown(false), SETTING_GROUPS.filter((g) => g !== 'Mouse'));
  for (const mac of [true, false]) {
    const shortcuts = rowsIn('Keyboard shortcuts', true, mac);
    assert.ok(shortcuts.every((r) => r.type === 'info'), 'no control in the shortcuts group');
    assert.equal(shortcuts.length, 1 + ALL_COMMANDS.length);
    assert.match(shortcuts[0].desc, /Settings, Hotkeys; search for ICOR for Life - Outliner\./);
    assert.deepEqual(shortcuts.slice(1).map((r) => r.name), ALL_COMMANDS.map((c) => c.name));
    for (const [i, c] of ALL_COMMANDS.entries()) {
      const row = shortcuts[i + 1];
      assert.ok(row.desc.length > 0, `${c.id} shows no chord`);
      if (['fold', 'unfold', 'collapse-all', 'expand-all'].includes(c.id)) assert.match(row.desc, /"Fold indent"/, `${c.id} names the fold indent requirement`);
      if (c.handBack) assert.match(row.desc, /Outside a list/, `${c.id} says what the editor keeps`);
      else assert.doesNotMatch(row.desc, /Outside a list/);
    }
    assert.match(shortcuts[1].desc, mac ? /^⌘ ⌥ ↑ / : /^Ctrl \+ Alt \+ ↑ /);
    const keys = rowsIn('Editing keys', true, mac);
    assert.ok(keys.every((r) => r.type === 'info'));
    /* Mod-Backspace is a macOS key; elsewhere its row is not shown. */
    assert.equal(keys.length, 1 + EDITING_KEYS.length - (mac ? 0 : 1));
    assert.match(keys[0].desc, /switched by the toggles above/);
    const settingNames = new Set(SETTING_ROWS.map((r) => r.name));
    for (const k of EDITING_KEYS) assert.ok(settingNames.has(k.setting), `${k.setting} is not a setting`);
    for (const row of keys.slice(1)) assert.match(row.desc, /Switched by "/);
    const modBackspace = keys.find((r) => r.desc.startsWith('Deletes back to the content start'));
    assert.equal(modBackspace?.name, mac ? '⌘ Backspace' : undefined);
    for (const row of keys) assert.ok(row.name.length > 0, 'a row with no key on this platform is not shown');
    const arrowLeft = keys.find((r) => r.desc.startsWith('At the content start, jumps'));
    assert.equal(arrowLeft.name, mac ? '←' : '←, Ctrl + ←');
  }
  for (const row of [...rowsIn('Keyboard shortcuts', true, true), ...rowsIn('Editing keys', true, true)]) {
    assert.ok(row.name === row.name.charAt(0).toUpperCase() + row.name.slice(1), `${row.name} starts with a capital`);
  }
});

test('move-to targets: headings and items in order, the moved subtree left out', async () => {
  const { moveTargets, headingOf } = await import('./build/pure.mjs');
  assert.deepEqual(headingOf('## Two words '), { level: 2, text: 'Two words' });
  assert.equal(headingOf('#no'), null);
  assert.equal(headingOf('####### seven'), null);
  const doc = ['# One', '- a', '  - a1', '- b', '', '## Two', 'text', '- [x] x', '```', '# fenced', '- fenced', '```'];
  const editor = new FakeEditor(doc, [cursor(1, 2)]);
  editor.nodes.set(9, ['HyperMD-codeblock']);
  editor.nodes.set(10, ['HyperMD-codeblock']);
  const targets = moveTargets(editor, cursor(1, 2));
  assert.deepEqual(targets.map((t) => [t.line, t.kind, t.text, t.depth]), [
    [0, 'heading', 'One', 1],
    [3, 'item', 'b', 1],
    [5, 'heading', 'Two', 2],
    [7, 'item', '[x] x', 1],
  ]);
});

test('fold markers: edits per line, the marked lines of a file', async () => {
  const { FOLD_MARKER, foldMarkerEdit, markedFoldLines, hasFoldMarker, withFoldMarker, withoutFoldMarker } = await import('./build/pure.mjs');
  assert.equal(FOLD_MARKER, ' %% fold %%');
  assert.deepEqual(foldMarkerEdit('- a', true), { from: 3, to: 3, insert: ' %% fold %%' });
  assert.equal(foldMarkerEdit('- a %% fold %%', true), null, 'already marked');
  assert.deepEqual(foldMarkerEdit('- a %% fold %%', false), { from: 3, to: 14, insert: '' });
  assert.equal(foldMarkerEdit('- a', false), null);
  assert.equal(foldMarkerEdit('# heading', true), null, 'only list items carry markers');
  assert.equal(foldMarkerEdit('  note %% fold %%', false), null, 'a notes line is not an item');
  assert.equal(withFoldMarker(withFoldMarker('- a')), '- a %% fold %%');
  assert.equal(withoutFoldMarker('- a'), '- a');
  assert.equal(hasFoldMarker('- a %% fold %% '), false, 'the marker sits at the very end');
  /* A trailing block id stays last: the editor and the metadata cache
     recognise `^id` only at the very end of the line (Flint H4). */
  assert.equal(hasFoldMarker('- a %% fold %% ^abc'), true, 'the marker before a block id');
  assert.equal(hasFoldMarker('- a ^abc'), false);
  assert.equal(withFoldMarker('- a ^abc'), '- a %% fold %% ^abc');
  assert.equal(withFoldMarker('- [ ] a ^abc-1'), '- [ ] a %% fold %% ^abc-1');
  assert.equal(withFoldMarker('- a %% fold %% ^abc'), '- a %% fold %% ^abc', 'already marked before the id');
  assert.equal(withoutFoldMarker('- a %% fold %% ^abc'), '- a ^abc');
  assert.equal(withoutFoldMarker('- a ^abc'), '- a ^abc');
  assert.deepEqual(foldMarkerEdit('- a ^abc', true), { from: 3, to: 3, insert: ' %% fold %%' }, 'inserted before the id');
  assert.deepEqual(foldMarkerEdit('- a %% fold %% ^abc', false), { from: 3, to: 14, insert: '' }, 'removed from before the id');
  assert.equal(foldMarkerEdit('- a %% fold %% ^abc', true), null);
  assert.equal(foldMarkerEdit('- a ^abc', false), null);
  assert.equal(hasFoldMarker('- a ^abc %% fold %%'), true, 'the shape an earlier build wrote is still read');
  assert.equal(withoutFoldMarker('- a ^abc %% fold %%'), '- a ^abc', 'and stripped');
  assert.equal(withFoldMarker('- a ^abc %% fold %%'), '- a ^abc %% fold %%', 'and not doubled');
  assert.equal(hasFoldMarker('- a ^abc def'), false, 'a caret that is not a trailing id is content');
  assert.equal(withFoldMarker('- a ^abc def'), '- a ^abc def %% fold %%');
  const editor = new FakeEditor(['- a %% fold %%', '  - b', 'para %% fold %%', '- c', '  - d %% fold %%', '- e %% fold %% ^e1', '- [ ] f %% fold %% ^f-1', '- g ^g1'], []);
  assert.deepEqual(markedFoldLines(editor), [0, 4, 5, 6]);
});

test('paired: an Editor belongs to a document when the line count, the first line and the last line agree', async () => {
  const { paired } = await import('./build/pure.mjs');
  const doc = (text) => {
    const lines = text.split('\n');
    return { lines: lines.length, line: (n) => ({ text: lines[n - 1] }) };
  };
  const editor = (text) => {
    const lines = text.split('\n');
    return { lineCount: () => lines.length, lastLine: () => lines.length - 1, getLine: (n) => lines[n] };
  };
  assert.equal(paired(editor('- a\n- b'), doc('- a\n- b')), true);
  assert.equal(paired(editor('x\ny\nz'), doc('x\ny\nw')), false, 'a multi-line cell whose count and first line agree with the note (Flint L4)');
  assert.equal(paired(editor('x'), doc('y')), false, 'one line, other text');
  assert.equal(paired(editor('- a\n- b'), doc('- a')), false, 'a one-line table cell with the parent note\'s Editor');
  assert.equal(paired(editor('- a\n- b'), doc('- x\n- b')), false, 'same count, other text');
  assert.equal(paired(editor(''), doc('')), true, 'an empty note is paired with its own Editor');
});
