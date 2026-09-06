/* The keyboard schemes as data: one table per scheme, action to chord,
 * one chord for macOS and one for Windows and Linux. The tables are Pax's
 * "Recommended scheme tables" (03 WiP, 2026-09-06) as shipped; the
 * Heptabase scheme borrows Tana's chord wherever Heptabase documents
 * none, and today the two differ at one action only (duplicate). They
 * stay two named tables so they can diverge as Tom refines them.
 *
 * A scheme is a CodeMirror keymap (schemeKeymap.ts), not a set of
 * Obsidian hotkeys: a keymap handler that returns false lets the key fall
 * through to the editor, so Mod+ArrowUp folds inside a list and goes to
 * the start of the note everywhere else. An Obsidian hotkey cannot do
 * that: it is captured at window level before any keymap and consumes
 * the chord in every editor. For the same reason a chord that is one of
 * Obsidian's own default hotkeys never reaches a keymap while that
 * hotkey stands; such a chord names the core command that takes it
 * (`takenBy`) and carries a second, free chord (`alt`) so the action
 * works before the user frees the first under Settings, Hotkeys.
 * test/schemes.test.mjs checks both against the 1.13.7 core list.
 *
 * Not in any scheme, on purpose: Tab, Shift-Tab, Enter, Mod-Shift-Enter,
 * Backspace, Delete, Mod-Backspace, ArrowLeft, Mod-A, Shift-Up and
 * Shift-Down are the shared editing layer (keymap.ts), the same in every
 * scheme and switched by the settings. Zoom, go to parent, next and
 * previous sibling, first and last item are unbound in both schemes: the
 * tools document no chord, and none is invented here. */
import type { Hotkey, Modifier } from '../commandTable';

export type SchemeId = 'tana' | 'heptabase' | 'none';

export const SCHEME_IDS: readonly SchemeId[] = ['tana', 'heptabase', 'none'];

export const SCHEME_NAMES: Record<SchemeId, string> = {
  tana: 'Tana',
  heptabase: 'Heptabase',
  none: 'Obsidian hotkeys only',
};

/* The actions a scheme binds. Each is a command too, and every one goes
   through the same operation the command runs. */
export type SchemeAction = 'fold' | 'unfold' | 'collapse-all' | 'expand-all' | 'move-up' | 'move-down' | 'delete-with-subtree' | 'duplicate' | 'toggle-done' | 'move-to';

export const SCHEME_ACTIONS: readonly SchemeAction[] = ['fold', 'unfold', 'collapse-all', 'expand-all', 'move-up', 'move-down', 'delete-with-subtree', 'duplicate', 'toggle-done', 'move-to'];

export interface Chords {
  mac: Hotkey;
  other: Hotkey;
}

export interface SchemeBinding extends Chords {
  /* Obsidian's own default hotkey on this chord, which runs first and
     consumes the key until the user removes it under Settings, Hotkeys. */
  takenBy?: { command: string; name: string };
  /* A second chord, free of core defaults, bound as well. */
  alt?: Chords;
}

export type SchemeTable = Record<SchemeAction, SchemeBinding>;

const chord = (modifiers: Modifier[], key: string): Hotkey => ({ modifiers, key });
const same = (modifiers: Modifier[], key: string): Chords => ({ mac: chord(modifiers, key), other: chord(modifiers, key) });

const OPEN_LINK_IN_NEW_TAB = { command: 'editor:open-link-in-new-leaf', name: 'Open link under cursor in new tab' };
const DELETE_PARAGRAPH = { command: 'editor:delete-paragraph', name: 'Delete paragraph' };

const TANA: SchemeTable = {
  fold: same(['Mod'], 'ArrowUp'),
  unfold: same(['Mod'], 'ArrowDown'),
  'collapse-all': { mac: chord(['Ctrl', 'Mod'], 'ArrowUp'), other: chord(['Ctrl', 'Alt'], 'ArrowUp') },
  'expand-all': { mac: chord(['Ctrl', 'Mod'], 'ArrowDown'), other: chord(['Ctrl', 'Alt'], 'ArrowDown') },
  'move-up': same(['Mod', 'Shift'], 'ArrowUp'),
  'move-down': same(['Mod', 'Shift'], 'ArrowDown'),
  'delete-with-subtree': same(['Mod', 'Shift'], 'Backspace'),
  duplicate: same(['Mod', 'Shift'], 'D'),
  'toggle-done': { ...same(['Mod'], 'Enter'), takenBy: OPEN_LINK_IN_NEW_TAB, alt: same(['Mod', 'Shift'], 'L') },
  'move-to': same(['Mod', 'Shift'], 'M'),
};

const HEPTABASE: SchemeTable = {
  ...TANA,
  duplicate: { ...same(['Mod'], 'D'), takenBy: DELETE_PARAGRAPH, alt: same(['Mod', 'Shift'], 'D') },
};

export const SCHEMES: Record<Exclude<SchemeId, 'none'>, SchemeTable> = { tana: TANA, heptabase: HEPTABASE };

/* The table for a scheme id, or null for "Obsidian hotkeys only". */
export function schemeTable(id: SchemeId): SchemeTable | null {
  return id === 'none' ? null : SCHEMES[id];
}

/* A chord in CodeMirror's key notation: modifiers joined by a dash, a
   single-letter key in lower case (CodeMirror reads Shift from the
   modifier, not from the letter's case). */
export function cmKey(hotkey: Hotkey): string {
  const key = hotkey.key.length === 1 ? hotkey.key.toLowerCase() : hotkey.key;
  return [...hotkey.modifiers, key].join('-');
}

export interface SchemeKey {
  action: SchemeAction;
  /* CodeMirror key names: `key` for Windows and Linux, `mac` for macOS. */
  key: string;
  mac: string;
}

/* Every key a scheme binds, the alternates included. Empty for "none". */
export function schemeKeys(id: SchemeId): SchemeKey[] {
  const table = schemeTable(id);
  if (!table) return [];
  const out: SchemeKey[] = [];
  for (const action of SCHEME_ACTIONS) {
    const binding = table[action];
    out.push({ action, key: cmKey(binding.other), mac: cmKey(binding.mac) });
    if (binding.alt) out.push({ action, key: cmKey(binding.alt.other), mac: cmKey(binding.alt.mac) });
  }
  return out;
}
