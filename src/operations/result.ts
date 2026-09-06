/* Every operation answers two questions: did it change the tree (or its
 * selection), and should the key that triggered it stop here. The four
 * combinations that occur:
 *   pass:      nothing done, let the editor's own handling run.
 *   consumed:  nothing done, but the key is swallowed (the guard cases:
 *              "you cannot delete into the bullet").
 *   updated:   the tree changed, apply it, swallow the key. */
import type { StickMode } from '../model';

export interface OpResult {
  updated: boolean;
  consume: boolean;
}

export const PASS: OpResult = { updated: false, consume: false };
export const CONSUMED: OpResult = { updated: false, consume: true };
export const UPDATED: OpResult = { updated: true, consume: true };

export interface OpContext {
  mode: StickMode;
}
