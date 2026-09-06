/* The thirteen commands as data: id, name, icon, action and default
 * hotkey, read by the command registration, the settings page and the
 * tests, so there is one table. Default hotkeys are a deliberate choice
 * for this build (Tom's directive 2026-09-06: a vault build, not a
 * directory submission; the directory's guideline says none). Obsidian
 * lets every user change or remove them under Settings, Hotkeys, which is
 * where the settings page sends them.
 *
 * Every chord was checked against two lists read from the Obsidian 1.13.7
 * bundle, both pinned as data in test/manifest.test.mjs: the app's own
 * default hotkeys (none of ours is one), and the editor's own keymap.
 * Obsidian's hotkey layer runs on the window in the capture phase and
 * consumes a bound chord whether or not the command did anything, so a
 * default hotkey never falls through to the editor; where the editor uses
 * the same chord, `handBack` names what the editor does with it, and the
 * command does that itself when the outliner has nothing to do (the
 * cursor is not in a list). Mod+ArrowUp and Mod+ArrowDown are not used on
 * purpose: on macOS they go to the start and end of the note. */
import type { ActionId } from './actions';

export type Modifier = 'Mod' | 'Ctrl' | 'Meta' | 'Alt' | 'Shift';

/* The same shape as Obsidian's Hotkey, without the import. */
export interface Hotkey {
  modifiers: Modifier[];
  key: string;
}

/* The editor's own behaviour for a chord the plugin also binds. The first
   two are the editor's Mod+] and Mod+[; the next two are macOS's
   Cmd+Shift+ArrowUp and ArrowDown (select to the start and end of the
   note), which Windows and Linux do not bind; the last two are the
   editor's Mod+Alt+ArrowUp and ArrowDown (add a cursor above or below). */
export type HandBack = 'indent-more' | 'indent-less' | 'select-to-start' | 'select-to-end' | 'cursor-above' | 'cursor-below';

export interface CommandSpec {
  id: string;
  name: string;
  icon: string;
  action: ActionId;
  hotkey: Hotkey;
  handBack?: HandBack;
}

const chord = (modifiers: Modifier[], key: string): Hotkey => ({ modifiers, key });

export const COMMANDS: readonly CommandSpec[] = [
  { id: 'fold', name: 'Fold the list item', icon: 'chevrons-down-up', action: 'fold', hotkey: chord(['Mod', 'Alt'], 'ArrowUp'), handBack: 'cursor-above' },
  { id: 'unfold', name: 'Unfold the list item', icon: 'chevrons-up-down', action: 'unfold', hotkey: chord(['Mod', 'Alt'], 'ArrowDown'), handBack: 'cursor-below' },
  { id: 'collapse-all', name: 'Collapse all under the list item', icon: 'fold-vertical', action: 'collapse-all', hotkey: chord(['Mod', 'Alt', 'Shift'], 'ArrowUp') },
  { id: 'expand-all', name: 'Expand all under the list item', icon: 'unfold-vertical', action: 'expand-all', hotkey: chord(['Mod', 'Alt', 'Shift'], 'ArrowDown') },
  { id: 'move-up', name: 'Move the list item up', icon: 'arrow-up', action: 'move-up', hotkey: chord(['Mod', 'Shift'], 'ArrowUp'), handBack: 'select-to-start' },
  { id: 'move-down', name: 'Move the list item down', icon: 'arrow-down', action: 'move-down', hotkey: chord(['Mod', 'Shift'], 'ArrowDown'), handBack: 'select-to-end' },
  { id: 'indent', name: 'Indent the list item', icon: 'indent', action: 'indent', hotkey: chord(['Mod'], ']'), handBack: 'indent-more' },
  { id: 'outdent', name: 'Outdent the list item', icon: 'outdent', action: 'outdent', hotkey: chord(['Mod'], '['), handBack: 'indent-less' },
  { id: 'insert-above', name: 'Insert a list item above', icon: 'list-plus', action: 'insert-above', hotkey: chord(['Mod', 'Shift'], 'A') },
  { id: 'delete-with-subtree', name: 'Delete the list item with its subtree', icon: 'trash', action: 'delete-with-subtree', hotkey: chord(['Mod', 'Shift'], 'Backspace') },
  { id: 'duplicate', name: 'Duplicate the list item with its subtree', icon: 'copy', action: 'duplicate', hotkey: chord(['Mod', 'Shift'], 'D') },
  { id: 'toggle-done', name: 'Toggle done on the list item', icon: 'check', action: 'toggle-done', hotkey: chord(['Mod', 'Shift'], 'L') },
];

/* The one command with a picker; it has no action id because it does not
   go through runAction. */
export const MOVE_TO_COMMAND = { id: 'move-to', name: 'Move the list item to...', icon: 'corner-down-right', hotkey: chord(['Mod', 'Shift'], 'M') } as const;

export interface ListedCommand {
  id: string;
  name: string;
  hotkey: Hotkey;
  handBack?: HandBack;
}

/* Every command, in the order the settings page lists them. */
export const ALL_COMMANDS: readonly ListedCommand[] = [...COMMANDS, MOVE_TO_COMMAND];

/* The chord the way Obsidian's own hotkey page prints it: glyphs on
   macOS, words elsewhere, arrows as arrows. */
const MAC_GLYPHS: Record<Modifier, string> = { Mod: '⌘', Ctrl: '⌃', Meta: '⌘', Alt: '⌥', Shift: '⇧' };
const OTHER_WORDS: Record<Modifier, string> = { Mod: 'Ctrl', Ctrl: 'Ctrl', Meta: 'Win', Alt: 'Alt', Shift: 'Shift' };
const MODIFIER_ORDER: readonly Modifier[] = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];
const KEY_GLYPHS: Record<string, string> = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ' ': 'Space' };

function keyLabel(key: string): string {
  const glyph = KEY_GLYPHS[key];
  if (glyph) return glyph;
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function describeHotkey(hotkey: Hotkey, mac: boolean): string {
  const names = mac ? MAC_GLYPHS : OTHER_WORDS;
  const parts = MODIFIER_ORDER.filter((m) => hotkey.modifiers.includes(m)).map((m) => names[m]);
  parts.push(keyLabel(hotkey.key));
  return parts.join(mac ? ' ' : ' + ');
}

/* What the editor does with the chord outside a list, in the words of the
   settings page. */
export const HAND_BACK_TEXT: Record<HandBack, string> = {
  'indent-more': 'Outside a list the editor indents the line, as it does without this plugin.',
  'indent-less': 'Outside a list the editor outdents the line, as it does without this plugin.',
  'select-to-start': 'Outside a list on macOS the editor selects to the start of the note, as it does without this plugin.',
  'select-to-end': 'Outside a list on macOS the editor selects to the end of the note, as it does without this plugin.',
  'cursor-above': 'Outside a list the editor adds a cursor on the line above, as it does without this plugin.',
  'cursor-below': 'Outside a list the editor adds a cursor on the line below, as it does without this plugin.',
};

/* The keys that are not commands: the outliner's editing behaviour inside
   a list, switched by a setting, not rebound. `mac: true` is a key that
   exists on macOS only; `mac: false` one that exists everywhere else. */
export interface EditingKey {
  keys: { hotkey: Hotkey; mac?: boolean }[];
  does: string;
  /* The name of the setting that switches this key. */
  setting: string;
}

export const EDITING_KEYS: readonly EditingKey[] = [
  { keys: [{ hotkey: chord([], 'Tab') }], does: 'Indents the item with everything under it.', setting: 'Tab moves the whole item' },
  { keys: [{ hotkey: chord(['Shift'], 'Tab') }], does: 'Outdents the item with everything under it.', setting: 'Tab moves the whole item' },
  { keys: [{ hotkey: chord([], 'Enter') }], does: 'Splits the item. At the end of an item with children the new item is the first child; an empty nested item is outdented instead of doubled.', setting: 'Enter knows about children' },
  { keys: [{ hotkey: chord(['Mod', 'Shift'], 'Enter') }], does: 'Inserts an empty item above the current one.', setting: 'Enter knows about children' },
  { keys: [{ hotkey: chord([], 'Backspace') }], does: 'At the content start, merges into the item above only when nothing is lost; otherwise the bullet stays.', setting: 'Keep the cursor in the content' },
  { keys: [{ hotkey: chord([], 'Delete') }], does: 'At the end of an item, merges the next item in under the same rule.', setting: 'Keep the cursor in the content' },
  { keys: [{ hotkey: chord(['Mod'], 'Backspace'), mac: true }], does: 'Deletes back to the content start and stops there.', setting: 'Keep the cursor in the content' },
  { keys: [{ hotkey: chord([], 'ArrowLeft') }, { hotkey: chord(['Ctrl'], 'ArrowLeft'), mac: false }], does: 'At the content start, jumps to the end of the previous visible line.', setting: 'Keep the cursor in the content' },
  { keys: [{ hotkey: chord(['Mod'], 'A') }], does: 'Selects the item, then the item with its children, then the whole list, then the note.', setting: 'Select all climbs' },
  { keys: [{ hotkey: chord(['Shift'], 'ArrowUp') }, { hotkey: chord(['Shift'], 'ArrowDown') }], does: 'Select whole items with their children, one sibling at a time.', setting: 'Shift-Up/Down selects whole items' },
];

export function editingKeyLabel(entry: EditingKey, mac: boolean): string {
  return entry.keys
    .filter((k) => k.mac === undefined || k.mac === mac)
    .map((k) => describeHotkey(k.hotkey, mac))
    .join(', ');
}
