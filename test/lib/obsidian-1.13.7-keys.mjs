/* Two key tables read from the Obsidian 1.13.7 bundle (app.js), pinned as
 * data so the gates need no private API and no running app. Mod is Cmd on
 * macOS and Ctrl elsewhere; `normalise` folds Meta into Mod on macOS and
 * Ctrl into Mod elsewhere, so a chord compares the way the app matches
 * it. Re-extract when the floor moves: every `hotkeys:[Yw([...],"key")]`
 * declaration with the `id:"..."` before it, and the editor keymap array
 * that starts with `Alt-ArrowLeft` plus the standard cursor keymap. */

/* The app's own default hotkeys, with the command each belongs to. A
   scheme chord that is one of these never reaches an editor keymap while
   the hotkey stands: the hotkey layer captures it at window level first
   and consumes it whether or not the command did anything. */
export const CORE_DEFAULT_HOTKEYS = [
  { chord: 'Mod+Shift+F', command: 'global-search:open' },
  { chord: 'Mod+G', command: 'graph:open' },
  { chord: 'Mod+S', command: 'editor:save-file' },
  { chord: 'Alt+Enter', command: 'editor:follow-link' },
  { chord: 'Mod+Enter', command: 'editor:open-link-in-new-leaf' },
  { chord: 'Mod+Alt+Shift+Enter', command: 'editor:open-link-in-new-window' },
  { chord: 'Mod+Alt+Enter', command: 'editor:open-link-in-new-split' },
  { chord: 'F2', command: 'workspace:edit-file-title' },
  { chord: 'Mod+Shift+T', command: 'workspace:undo-close-pane' },
  { chord: 'Ctrl+Tab', command: 'workspace:next-tab' },
  { chord: 'Meta+Shift+]', command: 'workspace:next-tab', mac: true },
  { chord: 'Ctrl+PageDown', command: 'workspace:next-tab', other: true },
  { chord: 'Ctrl+Shift+Tab', command: 'workspace:previous-tab' },
  { chord: 'Meta+Shift+[', command: 'workspace:previous-tab', mac: true },
  { chord: 'Ctrl+PageUp', command: 'workspace:previous-tab', other: true },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ chord: `Mod+${n}`, command: `workspace:goto-tab-${n}` })),
  { chord: 'Mod+9', command: 'workspace:goto-last-tab' },
  { chord: 'Mod+T', command: 'workspace:new-tab' },
  { chord: 'Mod+W', command: 'workspace:close' },
  { chord: 'Mod+Shift+W', command: 'workspace:close-window' },
  { chord: 'Mod+P', command: 'command-palette:open' },
  { chord: 'Mod+O', command: 'switcher:open' },
  { chord: 'Mod+Alt+ArrowLeft', command: 'app:go-back' },
  { chord: 'Mod+Alt+ArrowRight', command: 'app:go-forward' },
  { chord: 'Mod+,', command: 'app:open-settings' },
  { chord: 'Mod+E', command: 'markdown:toggle-preview' },
  { chord: 'Mod+;', command: 'markdown:add-metadata-property' },
  { chord: 'F1', command: 'app:open-help' },
  { chord: 'Mod+N', command: 'file-explorer:new-file' },
  { chord: 'Mod+Shift+N', command: 'file-explorer:new-file-in-new-pane' },
  { chord: 'Mod+F', command: 'editor:open-search' },
  { chord: 'Mod+Alt+F', command: 'editor:open-search-replace', mac: true },
  { chord: 'Mod+H', command: 'editor:open-search-replace', other: true },
  { chord: 'Mod+K', command: 'editor:insert-link' },
  { chord: 'Mod+B', command: 'editor:toggle-bold' },
  { chord: 'Mod+I', command: 'editor:toggle-italics' },
  { chord: 'Mod+/', command: 'editor:toggle-comments' },
  { chord: 'Mod+L', command: 'editor:toggle-checklist-status' },
  { chord: 'Mod+D', command: 'editor:delete-paragraph' },
];

/* The editor's own keymap (CodeMirror's default keymap less the entries
   Obsidian drops, plus the standard cursor keys). `shift` marks a cursor
   key whose Shift variant is bound too; `mac` a key bound on macOS only,
   `other` one bound everywhere but macOS. A scheme chord that appears
   here is shadowed inside a list and falls through outside one, because
   the scheme keymap runs first and returns false there. */
export const EDITOR_KEYS = [
  { chord: 'Alt+ArrowLeft', other: true, shift: true }, { chord: 'Ctrl+ArrowLeft', mac: true, shift: true },
  { chord: 'Alt+ArrowRight', other: true, shift: true }, { chord: 'Ctrl+ArrowRight', mac: true, shift: true },
  { chord: 'Mod+Alt+ArrowUp' }, { chord: 'Mod+Alt+ArrowDown' }, { chord: 'Escape' }, { chord: 'Mod+Enter' },
  { chord: 'Mod+I' }, { chord: 'Mod+[' }, { chord: 'Mod+]' }, { chord: 'Mod+Alt+\\' }, { chord: 'Mod+Shift+K' },
  { chord: 'Mod+Shift+\\' }, { chord: 'Mod+/' }, { chord: 'Alt+A' },
  { chord: 'ArrowLeft', shift: true }, { chord: 'Mod+ArrowLeft', other: true, shift: true }, { chord: 'Alt+ArrowLeft', mac: true, shift: true },
  { chord: 'Mod+ArrowLeft', mac: true, shift: true }, { chord: 'ArrowRight', shift: true }, { chord: 'Mod+ArrowRight', other: true, shift: true },
  { chord: 'Alt+ArrowRight', mac: true, shift: true }, { chord: 'Mod+ArrowRight', mac: true, shift: true },
  { chord: 'ArrowUp', shift: true }, { chord: 'Mod+ArrowUp', mac: true, shift: true }, { chord: 'Ctrl+ArrowUp', mac: true, shift: true },
  { chord: 'ArrowDown', shift: true }, { chord: 'Mod+ArrowDown', mac: true, shift: true }, { chord: 'Ctrl+ArrowDown', mac: true, shift: true },
  { chord: 'PageUp', shift: true }, { chord: 'PageDown', shift: true }, { chord: 'Home', shift: true }, { chord: 'Mod+Home', shift: true },
  { chord: 'End', shift: true }, { chord: 'Mod+End', shift: true }, { chord: 'Enter', shift: true }, { chord: 'Mod+A' },
  { chord: 'Backspace', shift: true }, { chord: 'Delete' }, { chord: 'Mod+Backspace', other: true }, { chord: 'Alt+Backspace', mac: true },
  { chord: 'Mod+Delete', other: true }, { chord: 'Alt+Delete', mac: true }, { chord: 'Mod+Backspace', mac: true }, { chord: 'Mod+Delete', mac: true },
];

const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'];

/* One string per chord on one platform: modifiers in a fixed order, the
   platform's Mod alias folded into Mod, a single-letter key upper-cased. */
export function normalise(chord, mac) {
  const parts = chord.split('+');
  const key = parts.pop();
  const alias = mac ? 'Meta' : 'Ctrl';
  const mods = new Set(parts.map((m) => (m === alias ? 'Mod' : m)));
  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), key.length === 1 ? key.toUpperCase() : key].join('+');
}

export function chordOf(hotkey, mac) {
  return normalise([...hotkey.modifiers, hotkey.key].join('+'), mac);
}

function onPlatform(entry, mac) {
  if (entry.mac && !mac) return false;
  if (entry.other && mac) return false;
  return true;
}

/* Chord to core command id, for one platform. */
export function coreChords(mac) {
  const out = new Map();
  for (const e of CORE_DEFAULT_HOTKEYS) if (onPlatform(e, mac)) out.set(normalise(e.chord, mac), e.command);
  return out;
}

/* Every chord the editor binds on one platform, Shift variants unfolded. */
export function editorChords(mac) {
  const out = new Set();
  for (const k of EDITOR_KEYS) {
    if (!onPlatform(k, mac)) continue;
    out.add(normalise(k.chord, mac));
    if (k.shift) out.add(normalise(`Shift+${k.chord}`, mac));
  }
  return out;
}
