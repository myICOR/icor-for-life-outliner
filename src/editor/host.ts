/* What the editor layer needs from the plugin: the live settings, a debug
 * log, and a way to say that folding is not available. */
import type { OutlinerSettings } from '../settings/model';

export interface EditorHost {
  readonly settings: OutlinerSettings;
  log(message: string): void;
  foldUnavailable(): void;
}
