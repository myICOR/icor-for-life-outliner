/* The settings page as data. Both render paths of the settings tab (the
 * 1.13 declarative one and the imperative fallback) draw from this table,
 * and the tests read it to prove every setting has exactly one row. */
import type { OutlinerSettings } from './model';

export type SettingGroup = 'Cursor' | 'Keys' | 'Folds' | 'Advanced';

export interface ToggleRow {
  type: 'toggle';
  group: SettingGroup;
  key: keyof OutlinerSettings;
  name: string;
  desc: string;
}

export interface DropdownRow {
  type: 'dropdown';
  group: SettingGroup;
  key: keyof OutlinerSettings;
  name: string;
  desc: string;
  options: Record<string, string>;
}

export type SettingRow = ToggleRow | DropdownRow;

export const SETTING_GROUPS: readonly SettingGroup[] = ['Cursor', 'Keys', 'Folds', 'Advanced'];

export const SETTING_ROWS: readonly SettingRow[] = [
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
    group: 'Folds',
    key: 'foldMarkers',
    name: 'Remember folds in the file',
    desc: 'Folding an item writes an invisible %% fold %% comment at the end of its line and unfolding removes it, so folds survive a reinstall, a new device and any sync tool. Off by default because every fold then changes the file, which shows up as an edit in a vault under version control. Markers already in a file are honoured on open either way.',
  },
  {
    type: 'toggle',
    group: 'Advanced',
    key: 'debug',
    name: 'Debug logging',
    desc: 'Writes what each key did, and why it did nothing, to the developer console.',
  },
];

export function settingKeys(): (keyof OutlinerSettings)[] {
  return SETTING_ROWS.map((r) => r.key);
}

export function rowsIn(group: SettingGroup): SettingRow[] {
  return SETTING_ROWS.filter((r) => r.group === group);
}
