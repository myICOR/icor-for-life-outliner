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
  DEFAULT_SETTINGS, normaliseSettings, keyEnabled, SETTING_ROWS, settingKeys,
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

test('node names: list, other, unknown', () => {
  assert.equal(classifyNodeNames(['HyperMD-list-line_HyperMD-list-line-1']), 'list');
  assert.equal(classifyNodeNames(['formatting_formatting-list_formatting-list-ul_list-1']), 'list');
  assert.equal(classifyNodeNames(['HyperMD-codeblock_HyperMD-codeblock-bg']), 'other');
  assert.equal(classifyNodeNames(['hmd-codeblock', 'HyperMD-list-line_HyperMD-list-line-1']), 'other', 'a fence inside an item is a fence');
  assert.equal(classifyNodeNames(['HyperMD-table-row_HyperMD-table-row-1']), 'other');
  assert.equal(classifyNodeNames(['hmd-frontmatter']), 'other');
  assert.equal(classifyNodeNames(['HyperMD-quote_HyperMD-quote-1']), 'other');
  assert.equal(classifyNodeNames(['inline-code']), 'unknown', 'inline code is not a code block');
  assert.equal(classifyNodeNames([]), 'unknown');
  assert.equal(classifyNodeNames(['Document']), 'unknown');
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
