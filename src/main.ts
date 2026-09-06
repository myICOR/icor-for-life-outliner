/* ICOR for Life - Outliner. Lists that behave like an outline: the keys
 * around a bullet know about the item's children, the cursor stays in the
 * content, a keyboard scheme (Tana or Heptabase) folds, moves, deletes,
 * duplicates and marks an item from the keyboard, and thirteen commands
 * carry the same behaviour to the palette and the mobile toolbar. The
 * plugin edits the active editor and nothing else: no file access, no
 * network. Its only styling is the drop line of a drag and the rows of
 * the move-to picker. */
import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { Notice, Platform, Plugin } from 'obsidian';
import type { OutlinerEditor } from './apply';
import { openMoveTo, registerCommands } from './commands';
import { cursorStick } from './editor/cursorStick';
import { dragDrop } from './editor/dragDrop';
import { foldMarkers } from './editor/foldMarkers';
import type { EditorHost } from './editor/host';
import { outlinerKeymaps } from './editor/keymap';
import { viewRegistry } from './editor/registry';
import { schemeKeymap } from './editor/schemeKeymap';
import { debugLog } from './log';
import { DEFAULT_SETTINGS, normaliseSettings } from './settings/model';
import type { OutlinerSettings } from './settings/model';
import { OutlinerSettingsTab } from './settings/SettingsTab';

const FOLD_UNAVAILABLE = 'Folding needs "Fold indent" switched on under Settings, Editor.';

export default class OutlinerPlugin extends Plugin implements EditorHost {
  override settings: OutlinerSettings = { ...DEFAULT_SETTINGS };

  /* The active scheme's keymap, registered once as a mutable array:
     Obsidian's way to change an editor extension after registration is
     to change the array's contents and call workspace.updateOptions(),
     which reconfigures every open Markdown view (1.13.7: a reconfigure of
     the core compartment that holds all plugin extensions) and is what an
     editor opened later reads. No reload, no private field. */
  private readonly schemeExtension: Extension[] = [];

  override async onload(): Promise<void> {
    this.settings = normaliseSettings(await this.loadData());
    this.schemeExtension.push(schemeKeymap(this.settings.scheme, this));
    this.registerEditorExtension([viewRegistry, ...outlinerKeymaps(this), cursorStick(this), ...foldMarkers(this)]);
    this.registerEditorExtension(this.schemeExtension);
    if (Platform.isDesktop) this.registerEditorExtension(dragDrop(this));
    registerCommands(this, this);
    this.addSettingTab(new OutlinerSettingsTab(this.app, this));
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  /* Swaps the scheme keymap in every open editor. */
  applyScheme(): void {
    this.schemeExtension.length = 0;
    this.schemeExtension.push(schemeKeymap(this.settings.scheme, this));
    this.app.workspace.updateOptions();
  }

  log(message: string): void {
    debugLog(this.settings.debug, message);
  }

  foldUnavailable(): void {
    new Notice(FOLD_UNAVAILABLE);
  }

  moveTo(editor: OutlinerEditor, view: EditorView): boolean {
    return openMoveTo(this.app, this, editor, view);
  }
}
