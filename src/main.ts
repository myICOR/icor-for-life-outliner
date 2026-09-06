/* ICOR for Life - Outliner. Lists that behave like an outline: the keys
 * around a bullet know about the item's children, the cursor stays in the
 * content, and six commands carry the same behaviour to the palette and
 * the mobile toolbar. The plugin edits the active editor and nothing else:
 * no file access, no network, no styling. */
import { Notice, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { cursorStick } from './editor/cursorStick';
import { foldMarkers } from './editor/foldMarkers';
import type { EditorHost } from './editor/host';
import { outlinerKeymaps } from './editor/keymap';
import { viewRegistry } from './editor/registry';
import { debugLog } from './log';
import { DEFAULT_SETTINGS, normaliseSettings } from './settings/model';
import type { OutlinerSettings } from './settings/model';
import { OutlinerSettingsTab } from './settings/SettingsTab';

const FOLD_UNAVAILABLE = 'Folding needs "Fold indent" switched on under Settings, Editor.';

export default class OutlinerPlugin extends Plugin implements EditorHost {
  override settings: OutlinerSettings = { ...DEFAULT_SETTINGS };

  override async onload(): Promise<void> {
    this.settings = normaliseSettings(await this.loadData());
    this.registerEditorExtension([viewRegistry, ...outlinerKeymaps(this), cursorStick(this), ...foldMarkers(this)]);
    registerCommands(this, this);
    this.addSettingTab(new OutlinerSettingsTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  log(message: string): void {
    debugLog(this.settings.debug, message);
  }

  foldUnavailable(): void {
    new Notice(FOLD_UNAVAILABLE);
  }
}
