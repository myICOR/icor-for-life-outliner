/* What the editor layer needs from the plugin: the live settings, a debug
 * log, a way to say that folding is not available, and a way to listen on
 * a window's document for as long as the plugin lives (drag and drop
 * follows the pointer out of the editor, and every window has its own
 * document). */
import type { OutlinerSettings } from '../settings/model';

export interface EditorHost {
  readonly settings: OutlinerSettings;
  log(message: string): void;
  foldUnavailable(): void;
  registerDomEvent<K extends keyof DocumentEventMap>(el: Document, type: K, callback: (this: HTMLElement, ev: DocumentEventMap[K]) => unknown, options?: boolean | AddEventListenerOptions): void;
}
