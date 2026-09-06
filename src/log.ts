/* One debug channel, off by default. It says what a key did or why it did
 * nothing; it never echoes document text. */
import { PLUGIN_ID } from './constants';

export function debugLog(enabled: boolean, message: string): void {
  if (enabled) console.debug(`[${PLUGIN_ID}] ${message}`);
}
