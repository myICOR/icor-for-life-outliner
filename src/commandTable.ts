/* The thirteen commands as data: id, name, icon and action, read by the
 * command registration, the settings page and the tests, so there is one
 * table. No command carries a default hotkey: an Obsidian hotkey is
 * captured at window level before any editor keymap and fires in every
 * editor, list or not, so a chord like Mod+ArrowUp as a hotkey would
 * take "go to the start of the note" away everywhere. The keyboard
 * schemes (src/editor/schemes.ts) bind the same actions as editor keys
 * that step aside outside a list. A hotkey the user sets on a command
 * under Settings, Hotkeys runs first and wins over the scheme; that is
 * the "change to your liking" path, and the settings page says so.
 *
 * The chord printer and the editing-key table below feed the read-only
 * rows of the settings page. */
import type { ActionId } from './actions';

export type Modifier = 'Mod' | 'Ctrl' | 'Meta' | 'Alt' | 'Shift';

/* The same shape as Obsidian's Hotkey, without the import. */
export interface Hotkey {
  modifiers: Modifier[];
  key: string;
}

export interface CommandSpec {
  id: string;
  name: string;
  icon: string;
  action: ActionId;
}

export const COMMANDS: readonly CommandSpec[] = [
  { id: 'fold', name: 'Fold the list item', icon: 'chevrons-down-up', action: 'fold' },
  { id: 'unfold', name: 'Unfold the list item', icon: 'chevrons-up-down', action: 'unfold' },
  { id: 'collapse-all', name: 'Collapse all under the list item', icon: 'fold-vertical', action: 'collapse-all' },
  { id: 'expand-all', name: 'Expand all under the list item', icon: 'unfold-vertical', action: 'expand-all' },
  { id: 'move-up', name: 'Move the list item up', icon: 'arrow-up', action: 'move-up' },
  { id: 'move-down', name: 'Move the list item down', icon: 'arrow-down', action: 'move-down' },
  { id: 'indent', name: 'Indent the list item', icon: 'indent', action: 'indent' },
  { id: 'outdent', name: 'Outdent the list item', icon: 'outdent', action: 'outdent' },
  { id: 'insert-above', name: 'Insert a list item above', icon: 'list-plus', action: 'insert-above' },
  { id: 'delete-with-subtree', name: 'Delete the list item with its subtree', icon: 'trash', action: 'delete-with-subtree' },
  { id: 'duplicate', name: 'Duplicate the list item with its subtree', icon: 'copy', action: 'duplicate' },
  { id: 'toggle-done', name: 'Toggle done on the list item', icon: 'check', action: 'toggle-done' },
];

/* The one command with a picker; it has no action id because it does not
   go through runAction. */
export const MOVE_TO_COMMAND = { id: 'move-to', name: 'Move the list item to...', icon: 'corner-down-right' } as const;

export interface ListedCommand {
  id: string;
  name: string;
}

/* Every command, in the order the settings page lists them. */
export const ALL_COMMANDS: readonly ListedCommand[] = [...COMMANDS, MOVE_TO_COMMAND];

export function commandName(id: string): string {
  const found = ALL_COMMANDS.find((c) => c.id === id);
  if (!found) throw new Error(`no command ${id}`);
  return found.name;
}

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

/* The keys that are not commands: the outliner's editing behaviour inside
   a list, the same in every scheme, switched by a setting, not rebound.
   `mac: true` is a key that exists on macOS only; `mac: false` one that
   exists everywhere else. */
export interface EditingKey {
  keys: { hotkey: Hotkey; mac?: boolean }[];
  does: string;
  /* The name of the setting that switches this key. */
  setting: string;
}

const chord = (modifiers: Modifier[], key: string): Hotkey => ({ modifiers, key });

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
