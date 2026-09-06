/* Identity and floor. One id across the manifest, the package and the
 * constant; one version across three files; a description the directory
 * accepts; every named import from 'obsidian' present at the declared
 * minAppVersion, read from the @since annotations in obsidian.d.ts, the
 * same source the directory's scanner reads; bare command ids and
 * sentence-case names; and no default hotkeys anywhere (the keyboard
 * schemes are editor keymaps, gated in test/schemes.test.mjs against the
 * app's own default hotkey table, pinned in test/lib). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ALL_COMMANDS, COMMANDS, MOVE_TO_COMMAND, PLUGIN_ID, PLUGIN_NAME, describeHotkey } from './build/pure.mjs';
import { CORE_DEFAULT_HOTKEYS, normalise } from './lib/obsidian-1.13.7-keys.mjs';

const repo = resolve(import.meta.dirname, '..');
const read = (f) => readFileSync(resolve(repo, f), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const versions = JSON.parse(read('versions.json'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const cmp = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

test('one identity across manifest, package and constants', () => {
  assert.equal(manifest.id, 'icor-for-life-outliner');
  assert.equal(PLUGIN_ID, manifest.id);
  assert.equal(pkg.name, manifest.id);
  assert.equal(manifest.name, 'ICOR for Life - Outliner');
  assert.equal(PLUGIN_NAME, manifest.name);
  assert.equal(manifest.author, 'myICOR');
  assert.equal(manifest.authorUrl, 'https://myicor.com');
  assert.equal(manifest.isDesktopOnly, false, 'an editor extension runs on every platform');
  /* The floor is a tested-core floor, not an API floor. The plugin
     shadows core's list keymap and hands back to it on every pass, and
     its correctness was proven against the 1.13 editor (its Enter, Tab,
     the Live Preview image editor's Prec.high keymap, the table cell
     editor); a keymap-shadowing plugin is coupled to the core it shadows.
     The one API that needs 1.13 is getSettingDefinitions(); the display()
     fallback that would have served older apps is deleted, because at
     this floor no supported app calls it. Decision: Larry, 2026-09-06.
     Countersigned: Marshall, 2026-09-06, before the 0.1.0 tag. */
  assert.equal(manifest.minAppVersion, '1.13.0');
  const tab = read('src/settings/SettingsTab.ts').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(tab, /\bdisplay\(/, 'the display() fallback is dead at this floor');
  assert.doesNotMatch(manifest.id, /obsidian|plugin$/);
});

test('the description is under 250 characters, ends with a period, and never names the app', () => {
  assert.ok(manifest.description.length < 250, `${manifest.description.length} characters`);
  assert.ok(manifest.description.endsWith('.'));
  assert.doesNotMatch(manifest.description, /obsidian/i);
});

test('one version across manifest, package and versions.json', () => {
  assert.equal(pkg.version, manifest.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test('every named import from obsidian exists at minAppVersion', () => {
  const dts = read('node_modules/obsidian/obsidian.d.ts');
  const since = new Map();
  for (const m of dts.matchAll(/\/\*\*([^]*?)\*\/\s*export (?:abstract )?(?:class|function|interface|type|const|enum|let|var) (\w+)/g)) {
    const s = m[1].match(/@since (\d+\.\d+\.\d+)/);
    if (s && !since.has(m[2])) since.set(m[2], s[1]);
  }
  const floor = manifest.minAppVersion;
  const offenders = [];
  for (const file of walk(resolve(repo, 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/import (?:type )?\{([^}]*)\} from 'obsidian'/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0];
        if (!name) continue;
        const s = since.get(name);
        if (s && cmp(s, floor) > 0) offenders.push(`${name} (@since ${s}) in ${file.slice(repo.length + 1)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `newer than minAppVersion ${floor}:\n  ${offenders.join('\n  ')}`);
});

test('commands: bare ids, sentence case, icons, no default hotkeys', () => {
  const ids = ALL_COMMANDS.map((c) => c.id);
  assert.deepEqual(ids, ['fold', 'unfold', 'collapse-all', 'expand-all', 'move-up', 'move-down', 'indent', 'outdent', 'insert-above', 'delete-with-subtree', 'duplicate', 'toggle-done', 'move-to']);
  for (const id of ids) assert.doesNotMatch(id, /icor|outliner|:/, `${id} carries a prefix`);
  for (const { name } of ALL_COMMANDS) {
    assert.match(name, /^[A-Z][a-z]/, `${name} is not sentence case`);
    assert.doesNotMatch(name.slice(1), /\b[A-Z][a-z]+/, `${name} has a capital mid-sentence`);
  }
  for (const c of [...COMMANDS, MOVE_TO_COMMAND]) assert.ok(c.icon.length > 0, `${c.id} has no icon`);
  /* No default hotkeys, anywhere: an Obsidian hotkey is captured at
     window level before any editor keymap and fires in every editor,
     list or not. The schemes are editor keymaps (src/editor/schemes.ts)
     and step aside outside a list. */
  for (const file of walk(resolve(repo, 'src'))) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(code, /hotkeys:/, `${file} sets a default hotkey`);
  }
  const src = read('src/commands.ts');
  assert.equal([...src.matchAll(/addCommand\(/g)].length, 2, 'the two registration sites');
});

test('the core default hotkey table is pinned in full and repeats no chord per platform', () => {
  assert.equal(CORE_DEFAULT_HOTKEYS.length, 46, 'the 1.13.7 extraction: 40 on every platform, 3 macOS only, 3 elsewhere');
  for (const mac of [true, false]) {
    const seen = new Set();
    for (const e of CORE_DEFAULT_HOTKEYS) {
      if ((e.mac && !mac) || (e.other && mac)) continue;
      const chord = normalise(e.chord, mac);
      assert.ok(!seen.has(chord), `${chord} pinned twice for ${mac ? 'macOS' : 'other'}`);
      seen.add(chord);
    }
    assert.equal(seen.size, 43);
  }
});

test('the settings page prints a chord the way the hotkey page does', () => {
  const up = { modifiers: ['Mod', 'Alt'], key: 'ArrowUp' };
  assert.equal(describeHotkey(up, true), '⌘ ⌥ ↑');
  assert.equal(describeHotkey(up, false), 'Ctrl + Alt + ↑');
  assert.equal(describeHotkey({ modifiers: ['Mod', 'Alt', 'Shift'], key: 'ArrowDown' }, true), '⌘ ⌥ ⇧ ↓');
  assert.equal(describeHotkey({ modifiers: ['Mod', 'Shift'], key: 'L' }, false), 'Ctrl + Shift + L');
  assert.equal(describeHotkey({ modifiers: ['Mod', 'Shift'], key: 'Backspace' }, true), '⌘ ⇧ Backspace');
  assert.equal(describeHotkey({ modifiers: ['Mod'], key: ']' }, false), 'Ctrl + ]');
  assert.equal(describeHotkey({ modifiers: [], key: 'Tab' }, true), 'Tab');
  assert.equal(describeHotkey({ modifiers: ['Ctrl'], key: 'ArrowLeft' }, false), 'Ctrl + ←');
  assert.equal(describeHotkey({ modifiers: [], key: 'PageUp' }, false), 'Page Up');
});

test('the release assets exist and the release notes for this version are written', () => {
  for (const f of ['manifest.json', 'styles.css', 'README.md', 'SECURITY.md', 'THIRD-PARTY-NOTICES.md', 'LICENSE', `docs/releases/${manifest.version}.md`, '.github/workflows/release.yml']) {
    assert.ok(statSync(resolve(repo, f)).isFile(), `${f} is missing`);
  }
});
