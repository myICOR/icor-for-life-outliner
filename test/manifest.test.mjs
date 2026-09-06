/* Identity and floor. One id across the manifest, the package and the
 * constant; one version across three files; a description the directory
 * accepts; every named import from 'obsidian' present at the declared
 * minAppVersion, read from the @since annotations in obsidian.d.ts, the
 * same source the directory's scanner reads; bare command ids and
 * sentence-case names; and one default hotkey per command, free against
 * the app's own defaults and, where the editor binds the same chord,
 * handing that behaviour back outside a list. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ALL_COMMANDS, COMMANDS, MOVE_TO_COMMAND, PLUGIN_ID, PLUGIN_NAME, describeHotkey } from './build/pure.mjs';

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
     Marshall to countersign before the tag. */
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

/* Obsidian 1.13.7's own default hotkeys, read from the bundle's
   `hotkeys:[...]` command declarations (Mod is Cmd on macOS and Ctrl
   elsewhere; a chord that exists on one platform only says so). The
   plugin's defaults may not collide with any of them. */
const CORE_DEFAULT_HOTKEYS = [
  'Mod+Shift+F', 'Mod+G', 'Mod+S', 'Alt+Enter', 'Mod+Enter', 'Mod+Alt+Shift+Enter', 'Mod+Alt+Enter', 'F2',
  'Mod+Shift+T', 'Ctrl+Tab', 'Meta+Shift+]', 'Ctrl+PageDown', 'Ctrl+Shift+Tab', 'Meta+Shift+[', 'Ctrl+PageUp',
  'Mod+1', 'Mod+2', 'Mod+3', 'Mod+4', 'Mod+5', 'Mod+6', 'Mod+7', 'Mod+8', 'Mod+9',
  'Mod+T', 'Mod+W', 'Mod+Shift+W', 'Mod+P', 'Mod+O', 'Mod+Alt+ArrowLeft', 'Mod+Alt+ArrowRight', 'Mod+,',
  'Mod+E', 'Mod+;', 'F1', 'Mod+N', 'Mod+Shift+N', 'Mod+F', 'Mod+Alt+F', 'Mod+H', 'Mod+K', 'Mod+B', 'Mod+I',
  'Mod+/', 'Mod+L', 'Mod+D',
];

/* The editor's own keymap in Obsidian 1.13.7 (CodeMirror's default keymap
   less the entries Obsidian drops, plus the standard cursor keys), read
   from the bundle. `shift` marks a cursor key whose Shift variant is bound
   too; `mac` marks a key bound on macOS only, `other` one bound
   everywhere but macOS. A plugin chord that appears here must name a
   hand-back, so the editor's behaviour survives outside a list. */
const EDITOR_KEYS = [
  { chord: 'Alt+ArrowLeft', other: true, shift: true }, { chord: 'Ctrl+ArrowLeft', mac: true, shift: true },
  { chord: 'Alt+ArrowRight', other: true, shift: true }, { chord: 'Ctrl+ArrowRight', mac: true, shift: true },
  { chord: 'Mod+Alt+ArrowUp' }, { chord: 'Mod+Alt+ArrowDown' }, { chord: 'Escape' }, { chord: 'Mod+Enter' },
  { chord: 'Mod+I' }, { chord: 'Mod+[' }, { chord: 'Mod+]' }, { chord: 'Mod+Alt+\\' }, { chord: 'Mod+Shift+K' },
  { chord: 'Mod+Shift+\\' }, { chord: 'Mod+/' }, { chord: 'Alt+A' },
  { chord: 'ArrowLeft', shift: true }, { chord: 'Mod+ArrowLeft', other: true, shift: true }, { chord: 'Alt+ArrowLeft', mac: true, shift: true },
  { chord: 'Mod+ArrowLeft', mac: true, shift: true }, { chord: 'ArrowRight', shift: true }, { chord: 'Mod+ArrowRight', other: true, shift: true },
  { chord: 'Alt+ArrowRight', mac: true, shift: true }, { chord: 'Mod+ArrowRight', mac: true, shift: true },
  { chord: 'ArrowUp', shift: true }, { chord: 'Mod+ArrowUp', mac: true, shift: true }, { chord: 'Ctrl+ArrowUp', mac: true, shift: true },
  { chord: 'ArrowDown', shift: true }, { chord: 'Mod+ArrowDown', mac: true, shift: true }, { chord: 'Ctrl+ArrowDown', mac: true, shift: true },
  { chord: 'PageUp', shift: true }, { chord: 'PageDown', shift: true }, { chord: 'Home', shift: true }, { chord: 'Mod+Home', shift: true },
  { chord: 'End', shift: true }, { chord: 'Mod+End', shift: true }, { chord: 'Enter', shift: true }, { chord: 'Mod+A' },
  { chord: 'Backspace', shift: true }, { chord: 'Delete' }, { chord: 'Mod+Backspace', other: true }, { chord: 'Alt+Backspace', mac: true },
  { chord: 'Mod+Delete', other: true }, { chord: 'Alt+Delete', mac: true }, { chord: 'Mod+Backspace', mac: true }, { chord: 'Mod+Delete', mac: true },
];

/* Which hand-back each overlapping chord must carry. */
const EXPECTED_HAND_BACKS = {
  'Mod+Alt+ArrowUp': 'cursor-above',
  'Mod+Alt+ArrowDown': 'cursor-below',
  'Mod+Shift+ArrowUp': 'select-to-start',
  'Mod+Shift+ArrowDown': 'select-to-end',
  'Mod+]': 'indent-more',
  'Mod+[': 'indent-less',
};

const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];

/* One string per chord, modifiers in a fixed order, the key case-folded,
   Meta read as Mod (which it is on macOS). */
function normalise(chord) {
  const parts = chord.split('+');
  const key = parts.pop();
  const mods = new Set(parts.map((m) => (m === 'Meta' ? 'Mod' : m)));
  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), key.length === 1 ? key.toUpperCase() : key].join('+');
}

function chordOf(hotkey) {
  return normalise([...hotkey.modifiers, hotkey.key].join('+'));
}

/* Every chord the editor binds, Shift variants unfolded. */
function editorChords() {
  const out = new Set();
  for (const k of EDITOR_KEYS) {
    out.add(normalise(k.chord));
    if (k.shift) out.add(normalise(`Shift+${k.chord}`));
  }
  return out;
}

test('commands: bare ids, sentence case, icons, one default hotkey each', () => {
  const ids = ALL_COMMANDS.map((c) => c.id);
  assert.deepEqual(ids, ['fold', 'unfold', 'collapse-all', 'expand-all', 'move-up', 'move-down', 'indent', 'outdent', 'insert-above', 'delete-with-subtree', 'duplicate', 'toggle-done', 'move-to']);
  for (const id of ids) assert.doesNotMatch(id, /icor|outliner|:/, `${id} carries a prefix`);
  for (const { name } of ALL_COMMANDS) {
    assert.match(name, /^[A-Z][a-z]/, `${name} is not sentence case`);
    assert.doesNotMatch(name.slice(1), /\b[A-Z][a-z]+/, `${name} has a capital mid-sentence`);
  }
  for (const c of [...COMMANDS, MOVE_TO_COMMAND]) assert.ok(c.icon.length > 0, `${c.id} has no icon`);
  for (const c of ALL_COMMANDS) {
    assert.ok(Array.isArray(c.hotkey.modifiers) && typeof c.hotkey.key === 'string' && c.hotkey.key.length > 0, `${c.id} has no hotkey`);
    for (const m of c.hotkey.modifiers) assert.ok(MODIFIER_ORDER.includes(m), `${c.id}: ${m} is not a modifier`);
  }
  const chords = ALL_COMMANDS.map((c) => chordOf(c.hotkey));
  assert.equal(new Set(chords).size, chords.length, 'two commands share a chord');
  /* The one registration site carries the table's hotkeys and nothing
     else in src does. */
  const src = read('src/commands.ts');
  assert.equal([...src.matchAll(/hotkeys: defaultHotkeys\(/g)].length, 2, 'both addCommand sites take their hotkey from the table');
  for (const file of walk(resolve(repo, 'src'))) {
    if (file.endsWith('/commands.ts')) continue;
    assert.doesNotMatch(readFileSync(file, 'utf8'), /hotkeys:/, `${file} sets a hotkey outside commands.ts`);
  }
});

test('default hotkeys: free against the 1.13.7 core defaults, never Mod+ArrowUp or Mod+ArrowDown', () => {
  const core = new Set(CORE_DEFAULT_HOTKEYS.map(normalise));
  assert.equal(core.size, CORE_DEFAULT_HOTKEYS.length, 'the pinned core list repeats a chord');
  for (const c of ALL_COMMANDS) {
    const chord = chordOf(c.hotkey);
    assert.ok(!core.has(chord), `${c.id}: ${chord} is a core default hotkey`);
    assert.ok(chord !== 'Mod+ArrowUp' && chord !== 'Mod+ArrowDown', `${c.id}: ${chord} is the start or end of the note on macOS`);
  }
});

test('default hotkeys: a chord the editor also binds carries the matching hand-back, and no other does', () => {
  const editor = editorChords();
  for (const c of ALL_COMMANDS) {
    const chord = chordOf(c.hotkey);
    const expected = EXPECTED_HAND_BACKS[chord];
    if (editor.has(chord)) {
      assert.ok(expected, `${c.id}: ${chord} is an editor key with no pinned hand-back`);
      assert.equal(c.handBack, expected, `${c.id}: ${chord} must hand back ${expected}`);
    } else {
      assert.equal(c.handBack, undefined, `${c.id}: ${chord} is not an editor key and needs no hand-back`);
      assert.equal(expected, undefined, `${chord} is pinned as an overlap but the editor does not bind it`);
    }
  }
  assert.deepEqual(Object.keys(EXPECTED_HAND_BACKS).sort(), ALL_COMMANDS.filter((c) => c.handBack).map((c) => chordOf(c.hotkey)).sort());
  /* The hand-back module handles exactly the six kinds and reaches the
     editor through its public API only. */
  const src = read('src/editor/handBack.ts').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const kind of Object.values(EXPECTED_HAND_BACKS)) assert.match(src, new RegExp(`case '${kind}':`), `handBack.ts handles ${kind}`);
  assert.match(src, /editor\.exec\('indentMore'\)/);
  assert.match(src, /editor\.exec\('indentLess'\)/);
  assert.match(src, /Platform\.isMacOS/, 'select to start and end are macOS keys');
  assert.match(src, /view\.moveVertically\(/, 'add cursor moves the way the editor does');
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
