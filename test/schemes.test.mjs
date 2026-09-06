/* The keyboard schemes as data: every scheme binds every action on both
 * platforms; no chord is one of Obsidian's own default hotkeys unless the
 * table says which command takes it and carries a free second chord; the
 * chords a scheme shares with the editor's own keys are exactly the
 * pinned set, shadowed inside a list only; and the two schemes differ
 * where Pax's tables differ and nowhere else. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMES, SCHEME_ACTIONS, SCHEME_IDS, SCHEME_NAMES, cmKey, schemeKeys, schemeTable } from './build/pure.mjs';
import { chordOf, coreChords, editorChords } from './lib/obsidian-1.13.7-keys.mjs';

const PLATFORMS = [
  { mac: true, name: 'macOS' },
  { mac: false, name: 'Windows and Linux' },
];

const chordsOf = (binding, mac) => (mac ? binding.mac : binding.other);

test('every scheme has a name, a table (or none), and binds every action on both platforms', () => {
  assert.deepEqual(SCHEME_IDS, ['tana', 'heptabase', 'none']);
  for (const id of SCHEME_IDS) assert.ok(SCHEME_NAMES[id].length > 0, `${id} has a name`);
  assert.equal(schemeTable('none'), null);
  assert.deepEqual(schemeKeys('none'), []);
  assert.deepEqual(SCHEME_ACTIONS, ['fold', 'unfold', 'collapse-all', 'expand-all', 'move-up', 'move-down', 'delete-with-subtree', 'duplicate', 'toggle-done', 'move-to']);
  for (const [id, table] of Object.entries(SCHEMES)) {
    assert.deepEqual(Object.keys(table).sort(), [...SCHEME_ACTIONS].sort(), `${id} binds every action and nothing else`);
    for (const action of SCHEME_ACTIONS) {
      for (const { mac, name } of PLATFORMS) {
        const h = chordsOf(table[action], mac);
        assert.ok(Array.isArray(h.modifiers) && h.key.length > 0, `${id}: ${action} on ${name}`);
      }
    }
  }
});

test('no scheme chord is a core default hotkey, except where the table names the command that takes it and a free second chord', () => {
  for (const [id, table] of Object.entries(SCHEMES)) {
    for (const { mac, name } of PLATFORMS) {
      const core = coreChords(mac);
      for (const action of SCHEME_ACTIONS) {
        const binding = table[action];
        const chord = chordOf(chordsOf(binding, mac), mac);
        const taker = core.get(chord);
        if (binding.takenBy) {
          assert.equal(taker, binding.takenBy.command, `${id}: ${action} ${chord} on ${name} says ${binding.takenBy.command} takes it`);
          assert.ok(binding.alt, `${id}: ${action} is taken by a core hotkey and needs a second chord`);
          const alt = chordOf(chordsOf(binding.alt, mac), mac);
          assert.ok(!core.has(alt), `${id}: ${action}'s second chord ${alt} is a core default on ${name}`);
        } else {
          assert.equal(taker, undefined, `${id}: ${action} ${chord} on ${name} is the core default of ${taker}`);
          assert.equal(binding.alt, undefined, `${id}: ${action} needs no second chord`);
        }
      }
    }
  }
});

test('within a scheme every bound key is unique on each platform', () => {
  for (const id of Object.keys(SCHEMES)) {
    for (const platform of ['mac', 'key']) {
      const keys = schemeKeys(id).map((k) => k[platform]);
      assert.equal(new Set(keys).size, keys.length, `${id}: a key is bound twice on ${platform}`);
    }
  }
});

test('the chords a scheme shares with the editor are the pinned set, and Mod+ArrowUp and ArrowDown are among them by design', () => {
  const expected = {
    /* Cmd+ArrowUp and ArrowDown go to the start and end of the note, with
       Shift they select there; inside a list the scheme folds and moves.
       Mod+Enter is the editor's insert-blank-line key too, moot while
       Obsidian's own hotkey takes the chord first. */
    mac: ['Mod+ArrowDown', 'Mod+ArrowUp', 'Mod+Enter', 'Mod+Shift+ArrowDown', 'Mod+Shift+ArrowUp'],
    /* Ctrl+Alt+ArrowUp and ArrowDown add a cursor above and below;
       inside a list the scheme collapses and expands all. */
    other: ['Mod+Alt+ArrowDown', 'Mod+Alt+ArrowUp', 'Mod+Enter'],
  };
  for (const [id, table] of Object.entries(SCHEMES)) {
    for (const { mac } of PLATFORMS) {
      const editor = editorChords(mac);
      const shared = new Set();
      for (const action of SCHEME_ACTIONS) {
        const binding = table[action];
        for (const h of [chordsOf(binding, mac), binding.alt ? chordsOf(binding.alt, mac) : null]) {
          if (!h) continue;
          const chord = chordOf(h, mac);
          if (editor.has(chord)) shared.add(chord);
        }
      }
      assert.deepEqual([...shared].sort(), expected[mac ? 'mac' : 'other'], `${id} on ${mac ? 'macOS' : 'other'}`);
    }
    assert.equal(chordOf(table.fold.mac, true), 'Mod+ArrowUp');
    assert.equal(chordOf(table.unfold.other, false), 'Mod+ArrowDown');
  }
});

test('Tana and Heptabase differ at duplicate and nowhere else', () => {
  const differ = SCHEME_ACTIONS.filter((a) => JSON.stringify(SCHEMES.tana[a]) !== JSON.stringify(SCHEMES.heptabase[a]));
  assert.deepEqual(differ, ['duplicate']);
  assert.equal(cmKey(SCHEMES.tana.duplicate.mac), 'Mod-Shift-d');
  assert.equal(cmKey(SCHEMES.heptabase.duplicate.mac), 'Mod-d');
  assert.equal(SCHEMES.heptabase.duplicate.takenBy.command, 'editor:delete-paragraph');
  assert.equal(cmKey(SCHEMES.heptabase.duplicate.alt.mac), 'Mod-Shift-d');
  assert.equal(SCHEMES.tana['toggle-done'].takenBy.command, 'editor:open-link-in-new-leaf');
  assert.equal(cmKey(SCHEMES.tana['toggle-done'].alt.other), 'Mod-Shift-l');
});

test('the tables as shipped, per platform', () => {
  const show = (id, mac) => Object.fromEntries(SCHEME_ACTIONS.map((a) => [a, cmKey(chordsOf(SCHEMES[id][a], mac))]));
  assert.deepEqual(show('tana', true), {
    fold: 'Mod-ArrowUp',
    unfold: 'Mod-ArrowDown',
    'collapse-all': 'Ctrl-Mod-ArrowUp',
    'expand-all': 'Ctrl-Mod-ArrowDown',
    'move-up': 'Mod-Shift-ArrowUp',
    'move-down': 'Mod-Shift-ArrowDown',
    'delete-with-subtree': 'Mod-Shift-Backspace',
    duplicate: 'Mod-Shift-d',
    'toggle-done': 'Mod-Enter',
    'move-to': 'Mod-Shift-m',
  });
  assert.deepEqual(show('tana', false), { ...show('tana', true), 'collapse-all': 'Ctrl-Alt-ArrowUp', 'expand-all': 'Ctrl-Alt-ArrowDown' });
  assert.deepEqual(show('heptabase', true), { ...show('tana', true), duplicate: 'Mod-d' });
  assert.deepEqual(show('heptabase', false), { ...show('tana', false), duplicate: 'Mod-d' });
  const keys = schemeKeys('tana');
  assert.equal(keys.length, SCHEME_ACTIONS.length + 1, 'the one taken chord adds its second key');
  assert.deepEqual(keys.filter((k) => k.action === 'toggle-done').map((k) => k.key), ['Mod-Enter', 'Mod-Shift-l']);
  assert.deepEqual(keys.find((k) => k.action === 'collapse-all'), { action: 'collapse-all', key: 'Ctrl-Alt-ArrowUp', mac: 'Ctrl-Mod-ArrowUp' });
});
