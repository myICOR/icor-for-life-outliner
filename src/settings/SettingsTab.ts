/* The settings page, declared: Obsidian 1.13 renders `getSettingDefinitions()`
 * and indexes it for settings search. The table it draws from is
 * definitions.ts. There is no `display()` fallback: at a 1.13.0 floor no
 * supported app would ever call it (see the floor note in
 * test/manifest.test.mjs). */
import { Platform, PluginSettingTab } from 'obsidian';
import type { App } from 'obsidian';
import type OutlinerPlugin from '../main';
import { groupsShown, rowsIn } from './definitions';
import type { SettingRow } from './definitions';
import { normaliseSettings } from './model';

type Definitions = ReturnType<PluginSettingTab['getSettingDefinitions']>;
type Group = Extract<Definitions[number], { type: 'group' | 'list' }>;
type GroupItem = NonNullable<Group['items']>[number];

const GROUP_CLASS = 'icor-outliner-settings-group';

export class OutlinerSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: OutlinerPlugin) {
    super(app, plugin);
  }

  override getSettingDefinitions(): Definitions {
    return groupsShown(Platform.isDesktop).map((group) => ({
      type: 'group' as const,
      heading: group,
      cls: GROUP_CLASS,
      items: rowsIn(group, Platform.isDesktop, Platform.isMacOS).map((row) => this.toItem(row)),
    }));
  }

  private toItem(row: SettingRow): GroupItem {
    if (row.type === 'toggle') return { name: row.name, desc: row.desc, control: { type: 'toggle', key: row.key } };
    if (row.type === 'dropdown') return { name: row.name, desc: row.desc, control: { type: 'dropdown', key: row.key, options: row.options } };
    /* A definition with no control, action or render is Obsidian's
       SettingDefinitionEmpty (obsidian.d.ts, @since 1.13.0): the app draws
       the name and the description and nothing else, and indexes the row
       for settings search like any other. */
    return { name: row.name, desc: row.desc };
  }

  override getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    this.plugin.settings = normaliseSettings({ ...this.plugin.settings, [key]: value });
    await this.plugin.saveSettings();
  }
}
