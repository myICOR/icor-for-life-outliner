/* The settings page as data. The settings tab's `getSettingDefinitions()`
 * draws from this table, and the tests read it to prove every setting has
 * exactly one row. Two groups carry no control at all: the default
 * hotkeys of the thirteen commands, and the editing keys that are not
 * commands; both are read-only rows built from src/commandTable.ts, so
 * the page never drifts from what the plugin binds. */
import { ALL_COMMANDS, EDITING_KEYS, HAND_BACK_TEXT, describeHotkey, editingKeyLabel } from '../commandTable';
import type { OutlinerSettings } from './model';

export type SettingGroup = 'Cursor' | 'Keys' | 'Mouse' | 'Folds' | 'Keyboard shortcuts' | 'Editing keys' | 'Advanced';

export interface ToggleRow {
  type: 'toggle';
  group: SettingGroup;
  key: keyof OutlinerSettings;
  name: string;
  desc: string;
  /* Hidden on phones and tablets, where the feature does not exist. */
  desktopOnly?: boolean;
}

export interface DropdownRow {
  type: 'dropdown';
  group: SettingGroup;
  key: keyof OutlinerSettings;
  name: string;
  desc: string;
  options: Record<string, string>;
}

/* A row with a name and a description and no control: Obsidian's
   SettingDefinitionEmpty. It changes nothing and is indexed for settings
   search like any other row. */
export interface InfoRow {
  type: 'info';
  group: SettingGroup;
  name: string;
  desc: string;
}

export type ControlRow = ToggleRow | DropdownRow;
export type SettingRow = ControlRow | InfoRow;

export const SETTING_GROUPS: readonly SettingGroup[] = ['Cursor', 'Keys', 'Mouse', 'Folds', 'Keyboard shortcuts', 'Editing keys', 'Advanced'];

export const SETTING_ROWS: readonly ControlRow[] = [
  {
    type: 'dropdown',
    group: 'Cursor',
    key: 'stickCursor',
    name: 'Keep the cursor in the content',
    desc: 'Where the cursor may go on a list line. Also governs Backspace, Delete and the arrow keys at the start of an item.',
    options: {
      never: 'Never',
      'bullet-only': 'After the bullet',
      'bullet-and-checkbox': 'After the bullet and the checkbox',
    },
  },
  {
    type: 'toggle',
    group: 'Keys',
    key: 'betterTab',
    name: 'Tab moves the whole item',
    desc: 'Tab and Shift-Tab indent and outdent an item together with everything under it.',
  },
  {
    type: 'toggle',
    group: 'Keys',
    key: 'betterEnter',
    name: 'Enter knows about children',
    desc: 'Enter at the end of an item with children starts a new first child; an empty nested item is outdented instead of doubled. Mod-Shift-Enter inserts an empty item above.',
  },
  {
    type: 'toggle',
    group: 'Keys',
    key: 'selectAll',
    name: 'Select all climbs',
    desc: 'Select all picks the item, then the item with its children, then the whole list, then the note.',
  },
  {
    type: 'toggle',
    group: 'Keys',
    key: 'selectItems',
    name: 'Shift-Up/Down selects whole items',
    desc: 'Shift-Down selects the item and the next one, whole, with their children; Shift-Up the item and the previous one. Tab, Shift-Tab, move, delete, duplicate, toggle done, expand and collapse then work on all of them at once.',
  },
  {
    type: 'toggle',
    group: 'Mouse',
    key: 'dragDrop',
    name: 'Drag and drop',
    desc: 'Drag a bullet with everything under it to a new place in its list: before or after another item, or into an item as its first child. Desktop only, with the mouse. Escape cancels.',
    desktopOnly: true,
  },
  {
    type: 'toggle',
    group: 'Folds',
    key: 'foldMarkers',
    name: 'Remember folds in the file',
    desc: 'Folding an item writes a %% fold %% comment at the end of its line and unfolding removes it, so folds survive a reinstall, a new device and any sync tool. It is an Obsidian comment: hidden in reading view, shown faint at the line end in Live Preview and source mode. With this on, opening a note also writes markers for folds Obsidian already remembers, and so does the next edit in a list, so the file catches up. Off by default because every fold then changes the file, which shows up as an edit in a vault under version control. Markers already in a file are honoured on open either way. Folding itself needs "Fold indent" on under Settings, Editor.',
  },
  {
    type: 'toggle',
    group: 'Advanced',
    key: 'debug',
    name: 'Debug logging',
    desc: 'Writes what each key did, and why it did nothing, to the developer console.',
  },
];

const CHANGE_THEM = 'Change any of these under Settings, Hotkeys; search for ICOR for Life - Outliner.';
const NEEDS_FOLD_INDENT = 'Needs "Fold indent" on under Settings, Editor.';
const FOLD_COMMANDS = new Set(['fold', 'unfold', 'collapse-all', 'expand-all']);
const NOT_COMMANDS = 'These are the outliner\'s editing behaviour inside a list, switched by the toggles above rather than rebound. They are not commands, so they have no entry under Settings, Hotkeys.';

/* The read-only rows, built for the platform the page is shown on. */
export function infoRows(group: SettingGroup, mac: boolean): InfoRow[] {
  if (group === 'Keyboard shortcuts') {
    return [
      { type: 'info', group, name: 'Where to change them', desc: CHANGE_THEM },
      ...ALL_COMMANDS.map((c): InfoRow => {
        const parts = [describeHotkey(c.hotkey, mac)];
        if (FOLD_COMMANDS.has(c.id)) parts.push(NEEDS_FOLD_INDENT);
        if (c.handBack) parts.push(HAND_BACK_TEXT[c.handBack]);
        return { type: 'info', group, name: c.name, desc: parts.join(' ') };
      }),
    ];
  }
  if (group === 'Editing keys') {
    return [
      { type: 'info', group, name: 'Not rebound here', desc: NOT_COMMANDS },
      /* A key that does not exist on this platform (Mod-Backspace is
         macOS only) has no row. */
      ...EDITING_KEYS.map((k): InfoRow => ({ type: 'info', group, name: editingKeyLabel(k, mac), desc: `${k.does} Switched by "${k.setting}".` })).filter((r) => r.name.length > 0),
    ];
  }
  return [];
}

export function settingKeys(): (keyof OutlinerSettings)[] {
  return SETTING_ROWS.map((r) => r.key);
}

export function rowsIn(group: SettingGroup, desktop = true, mac = false): SettingRow[] {
  const controls = SETTING_ROWS.filter((r) => r.group === group && (desktop || !(r.type === 'toggle' && r.desktopOnly)));
  return [...controls, ...infoRows(group, mac)];
}

/* Groups with at least one row on this platform. */
export function groupsShown(desktop = true): SettingGroup[] {
  return SETTING_GROUPS.filter((g) => rowsIn(g, desktop).length > 0);
}
