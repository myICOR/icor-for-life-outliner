/* The settings, their defaults, and the one normaliser that turns whatever
 * data.json holds into a valid record. Which key each setting gates lives
 * here too, so the keymap and the tests read the same table. */
import type { StickMode } from '../model';

export interface OutlinerSettings {
  stickCursor: StickMode;
  betterTab: boolean;
  betterEnter: boolean;
  selectAll: boolean;
  selectItems: boolean;
  foldMarkers: boolean;
  dragDrop: boolean;
  debug: boolean;
}

export const DEFAULT_SETTINGS: OutlinerSettings = {
  stickCursor: 'bullet-and-checkbox',
  betterTab: true,
  betterEnter: true,
  selectAll: true,
  selectItems: true,
  foldMarkers: false,
  dragDrop: true,
  debug: false,
};

const STICK_MODES: readonly StickMode[] = ['never', 'bullet-only', 'bullet-and-checkbox'];

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function normaliseSettings(raw: unknown): OutlinerSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const stick = r.stickCursor;
  return {
    stickCursor: typeof stick === 'string' && (STICK_MODES as readonly string[]).includes(stick) ? (stick as StickMode) : DEFAULT_SETTINGS.stickCursor,
    betterTab: bool(r.betterTab, DEFAULT_SETTINGS.betterTab),
    betterEnter: bool(r.betterEnter, DEFAULT_SETTINGS.betterEnter),
    selectAll: bool(r.selectAll, DEFAULT_SETTINGS.selectAll),
    selectItems: bool(r.selectItems, DEFAULT_SETTINGS.selectItems),
    foldMarkers: bool(r.foldMarkers, DEFAULT_SETTINGS.foldMarkers),
    dragDrop: bool(r.dragDrop, DEFAULT_SETTINGS.dragDrop),
    debug: bool(r.debug, DEFAULT_SETTINGS.debug),
  };
}

export type KeyAction = 'indent' | 'outdent' | 'enter' | 'backspace' | 'delete' | 'delete-to-line-start' | 'arrow-left' | 'select-all' | 'select-down' | 'select-up' | 'insert-above';

/* Is this key's behaviour switched on? Commands are never gated. */
export function keyEnabled(settings: OutlinerSettings, action: KeyAction): boolean {
  switch (action) {
    case 'indent':
    case 'outdent':
      return settings.betterTab;
    case 'enter':
    case 'insert-above':
      return settings.betterEnter;
    case 'select-all':
      return settings.selectAll;
    case 'select-down':
    case 'select-up':
      return settings.selectItems;
    case 'backspace':
    case 'delete':
    case 'delete-to-line-start':
    case 'arrow-left':
      return settings.stickCursor !== 'never';
    default:
      return false;
  }
}
