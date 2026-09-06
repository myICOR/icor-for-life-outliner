/* ICOR for Life - Outliner. Lists that behave like an outline: the keys
 * around a bullet know about the item's children, the cursor stays in the
 * content, and thirteen commands carry the same behaviour to the palette
 * and the mobile toolbar. The plugin edits the active editor and nothing
 * else: no file access, no network. Its only styling is the drop line of
 * a drag and the rows of the move-to picker. */
import { Notice, Platform, Plugin } from 'obsidian';
import { registerCommands } from './commands';
import { cursorStick } from './editor/cursorStick';
import { dragDrop } from './editor/dragDrop';
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
    if (Platform.isDesktop) this.registerEditorExtension(dragDrop(this));
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
