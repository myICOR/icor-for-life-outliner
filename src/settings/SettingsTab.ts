/* Two render paths, one table. Obsidian 1.13 renders `getSettingDefinitions()`
 * and indexes it for settings search; `display()` stays as the fallback and
 * nothing else, which is the case its deprecation notice carves out. Both
 * are driven from definitions.ts. */
import { PluginSettingTab, Setting } from 'obsidian';
import type { App } from 'obsidian';
import { INK_PLUGIN_ATTR, PLUGIN_ID } from '../constants';
import type OutlinerPlugin from '../main';
import { SETTING_GROUPS, rowsIn } from './definitions';
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

  /* ------------------------------------------------ 1.13: declarative */

  override getSettingDefinitions(): Definitions {
    return SETTING_GROUPS.map((group) => ({
      type: 'group' as const,
      heading: group,
      cls: GROUP_CLASS,
      items: rowsIn(group).map((row) => this.toItem(row)),
    }));
  }

  private toItem(row: SettingRow): GroupItem {
    if (row.type === 'toggle') return { name: row.name, desc: row.desc, control: { type: 'toggle', key: row.key } };
    return { name: row.name, desc: row.desc, control: { type: 'dropdown', key: row.key, options: row.options } };
  }

  override getControlValue(key: string): unknown {
    return (this.plugin.settings as unknown as Record<string, unknown>)[key];
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    this.plugin.settings = normaliseSettings({ ...this.plugin.settings, [key]: value });
    await this.plugin.saveSettings();
  }

  /* ----------------------------------------- < 1.13: imperative fallback */

  override display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('icor-outliner-settings');
    containerEl.setAttr(INK_PLUGIN_ATTR, PLUGIN_ID);
    for (const group of SETTING_GROUPS) {
      new Setting(containerEl).setName(group).setHeading();
      for (const row of rowsIn(group)) this.render(containerEl, row);
    }
  }

  private render(parent: HTMLElement, row: SettingRow): void {
    const setting = new Setting(parent).setName(row.name).setDesc(row.desc);
    const save = (value: unknown): void => void this.setControlValue(row.key, value);
    const current = this.getControlValue(row.key);
    if (row.type === 'toggle') {
      setting.addToggle((t) => t.setValue(current === true).onChange(save));
      return;
    }
    setting.addDropdown((d) => d.addOptions(row.options).setValue(typeof current === 'string' ? current : '').onChange(save));
  }
}
