/* Mutation runs: break one guard at a time in a copy of the source, build
 * it, run the whole fixture corpus against it, and record which cases go
 * red. A guard that no case catches is a hollow gate, and this script exits
 * non-zero on one. Run with `npm run mutate`; the table is printed and
 * written to test/build/mutations.md. */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildPure } from './lib/build-pure.mjs';
import { loadFixtures, runCase } from './lib/fixtures.mjs';

const repo = resolve(import.meta.dirname, '..');
const fixtures = loadFixtures(resolve(repo, 'test/fixtures'));

const MUTATIONS = [
  {
    id: 'fold-reapply',
    what: 'the fold re-apply after the replacement',
    file: 'src/apply/apply.ts',
    find: 'if (item.folded && !folded.has(line)) editor.fold(line);',
    replace: 'if (item.folded && !folded.has(line)) { /* mutated: no re-fold */ }',
  },
  {
    id: 'indent-chain',
    what: 'the indent fallback chain (unit only)',
    file: 'src/operations/indentation.ts',
    find: 'return (parent ? childStep(parent) : null) ?? (own.length > 0 ? own : null) ?? listStep(tree) ?? tree.indentUnit;',
    replace: 'return tree.indentUnit;',
  },
  {
    id: 'indent-chain-sibling',
    what: "the first link of the chain (the sibling's children)",
    file: 'src/operations/indentation.ts',
    find: 'return (parent ? childStep(parent) : null) ?? (own.length > 0 ? own : null) ?? listStep(tree) ?? tree.indentUnit;',
    replace: 'return (own.length > 0 ? own : null) ?? listStep(tree) ?? tree.indentUnit;',
  },
  {
    id: 'indent-chain-own',
    what: "the second link of the chain (the item's own step)",
    file: 'src/operations/indentation.ts',
    find: 'return (parent ? childStep(parent) : null) ?? (own.length > 0 ? own : null) ?? listStep(tree) ?? tree.indentUnit;',
    replace: 'return (parent ? childStep(parent) : null) ?? listStep(tree) ?? tree.indentUnit;',
  },
  {
    id: 'checkbox-carry',
    what: 'the task box carried onto the new item',
    file: 'src/operations/createItem.ts',
    find: "const box = item.checkbox ? '[ ]' : null;",
    replace: 'const box = null;',
  },
  {
    id: 'code-fence-bail',
    what: 'the code-fence bail in the node classifier',
    file: 'src/editor/nodes.ts',
    find: "const BAIL_PREFIXES = ['HyperMD-codeblock', 'hmd-codeblock', ",
    replace: 'const BAIL_PREFIXES = [',
  },
  {
    id: 'single-cursor-guard',
    what: 'the single-cursor guard',
    file: 'src/actions.ts',
    find: "if (selections.length !== 1 || !selection) return pass('one selection at a time');",
    replace: "if (!selection) return pass('one selection at a time');",
  },
  {
    id: 'non-list-node-check',
    what: 'the non-list-node check before any operation',
    file: 'src/actions.ts',
    find: "if (classifyNodeNames(editor.nodeNamesAt(selection.head.line)) === 'other') return pass('not a list line');",
    replace: '',
  },
  {
    id: 'merge-safety',
    what: 'the merge safety rule (Backspace and Delete)',
    file: 'src/operations/merge.ts',
    find: 'return bothEmpty || earlierEmptyAtSameLevel || laterEmptyUnderEarlier;',
    replace: 'return true;',
  },
  {
    id: 'mixed-indent-refusal',
    what: 'the refusal of mixed tab and space indentation',
    file: 'src/model/parser.ts',
    find: "if (isMixedIndentation(indents)) return { ok: false, reason: 'mixed-indentation' };",
    replace: '',
  },
  {
    id: 'whole-item-detection',
    what: 'the whole-item test (any range counts as whole items)',
    file: 'src/operations/selection.ts',
    find: 'if (!atItemStart(from) || !atLastLineEnd(to)) return null;',
    replace: '',
  },
  {
    id: 'select-down-extend',
    what: 'Shift-Down reaching the next sibling (selects the item alone)',
    file: 'src/operations/selectItems.ts',
    find: 'setWholeItemSelection(tree, item, next ?? item);',
    replace: 'setWholeItemSelection(tree, item, item);',
  },
  {
    id: 'select-head-moves',
    what: 'the head end moving from a whole-item selection (the anchor moves instead)',
    file: 'src/operations/selectItems.ts',
    find: 'setWholeItemSelection(tree, range.anchorItem, next);',
    replace: 'setWholeItemSelection(tree, next, range.headItem);',
  },
  {
    id: 'multi-indent-all',
    what: 'Tab over every selected item (the first only)',
    file: 'src/operations/indent.ts',
    find: 'for (const item of sel.items) {',
    replace: 'for (const item of sel.items.slice(0, 1)) {',
  },
  {
    id: 'multi-move-all',
    what: 'move down over every selected item (the last only)',
    file: 'src/operations/move.ts',
    find: 'for (const item of sel.items) tree.detach(item);',
    replace: 'for (const item of sel.items.slice(-1)) tree.detach(item);',
  },
  {
    id: 'insert-above-position',
    what: 'the new item going above (goes below)',
    file: 'src/operations/insertAbove.ts',
    find: 'tree.attach(created, item.parent, tree.indexOf(item));',
    replace: 'tree.attach(created, item.parent, tree.indexOf(item) + 1);',
  },
  {
    id: 'delete-subtree-children',
    what: 'delete with subtree taking the children (they stay behind)',
    file: 'src/operations/deleteSubtree.ts',
    find: 'for (const item of sel.items) tree.detach(item);',
    replace: 'for (const item of sel.items) { const kids = [...item.children]; tree.detach(item); kids.forEach((k, i) => { tree.detach(k); tree.attach(k, first.parent, i); }); }',
  },
  {
    id: 'duplicate-folds',
    what: 'the fold flag copied onto the duplicate (copies open)',
    file: 'src/operations/duplicate.ts',
    find: 'copy.folded = item.folded;',
    replace: 'copy.folded = false;',
  },
  {
    id: 'fold-all-depth',
    what: 'expand and collapse all reaching every level (one level only)',
    file: 'src/operations/foldAll.ts',
    find: '  for (const child of item.children) setFolds(child, folded);',
    replace: '  if (item.parent === null) for (const child of item.children) setFolds(child, folded);',
  },
  {
    id: 'toggle-done-swap',
    what: 'the checked box turning unchecked (stays checked)',
    file: 'src/operations/toggleDone.ts',
    find: "item.checkbox = item.checkbox === '[ ]' ? '[x]' : '[ ]';",
    replace: "item.checkbox = '[x]';",
  },
  {
    id: 'one-replace',
    what: 'the diff (every changed line replaced one by one)',
    file: 'src/apply/apply.ts',
    find: 'editor.replaceRange(change.text, change.from, change.to);',
    replace: 'for (const piece of change.text.split(\'\\n\')) { editor.replaceRange(piece, change.from, change.to); break; }',
  },
];

const root = resolve(repo, 'test/build/mutants');
rmSync(root, { recursive: true, force: true });
mkdirSync(root, { recursive: true });

const rows = [];
let hollow = 0;
for (const m of MUTATIONS) {
  const dir = resolve(root, m.id);
  cpSync(resolve(repo, 'src'), resolve(dir, 'src'), { recursive: true });
  mkdirSync(resolve(dir, 'test'), { recursive: true });
  for (const f of ['entry.ts', 'fake.ts']) cpSync(resolve(repo, 'test', f), resolve(dir, 'test', f));
  const target = resolve(dir, m.file);
  const source = readFileSync(target, 'utf8');
  const hits = source.split(m.find).length - 1;
  if (hits !== 1) throw new Error(`mutation ${m.id}: pattern found ${hits} times in ${m.file}, expected exactly once`);
  writeFileSync(target, source.replace(m.find, m.replace));
  const bundle = await buildPure({ cwd: dir, entry: 'test/entry.ts', outfile: 'pure.mjs' });
  const pure = await import(pathToFileURL(bundle).href);
  const red = [];
  for (const c of fixtures) {
    let problem;
    try {
      problem = runCase(pure, c);
    } catch (e) {
      problem = e instanceof Error ? e.message : String(e);
    }
    if (problem !== null) red.push(`${c.file.replace(/\.txt$/, '')}: ${c.name}`);
  }
  if (red.length === 0) hollow++;
  rows.push({ ...m, red });
}

const lines = ['| Mutation | What was broken | Cases that went red |', '| --- | --- | --- |'];
for (const r of rows) {
  lines.push(`| \`${r.id}\` | ${r.what} | ${r.red.length}: ${r.red.map((n) => `${n}`).join('; ')} |`);
}
const table = lines.join('\n');
console.log(table);
writeFileSync(resolve(repo, 'test/build/mutations.md'), `${table}\n`);
console.log(`\n${rows.length} mutations, ${fixtures.length} cases each, ${hollow} hollow`);
if (hollow > 0) {
  console.error('a mutation survived every case: that guard is not gated');
  process.exit(1);
}
