# Security Policy

ICOR for Life - Outliner changes how a few keys behave inside a list in the
editor. It edits the note you are typing in, through the editor's own API,
and it does nothing else: it reads no file, opens no connection, spawns no
process, touches no clipboard. That is the whole capability, and this
document says so with the file to read behind each claim.

If you find a way to make this plugin do something its user did not ask for,
we want to hear about it before anyone else does.

## Reporting a vulnerability

**Please do not open a public GitHub issue for a security problem.**

Two channels, in order of preference:

1. **GitHub private security advisory** (preferred). Open a draft advisory on
   the Security tab of this repository. It stays private between you and the
   maintainer until a fix ships.
2. **Email** `team@myicor.com` with `SECURITY` and `icor-for-life-outliner`
   in the subject line. This is a monitored mailbox.

A useful report contains the plugin version (`manifest.json`), your Obsidian
version and operating system, what an attacker can do and what they need in
order to do it, and steps to reproduce against a throwaway vault.

## What to expect

| Stage | Target |
| --- | --- |
| We acknowledge your report | within 5 business days |
| We tell you whether we agree it is a vulnerability, and how severe | within 10 business days |
| We ship a fix for a confirmed critical or high issue | we aim for 30 days |
| We ask you to hold public disclosure until | a fix ships, or 90 days from your report, whichever comes first |

Only the most recent release is supported. One branch, no backports.

## Scope: exactly what this plugin does

**It edits the note in the active editor, and only through the documented
editor API.** `src/editor/adapter.ts` is where the plugin's operations
touch an editor. It reads lines and selections, and writes with
`replaceRange` and `setSelection`; every key and command issues at most
one `replaceRange` (`test/fixtures.test.mjs` pins that per case), which is
what keeps undo to one step per key. Moving an item to another list in
the same file is the one two-span write: `Editor.transaction` with two
changes, so the departure and the arrival are one undo step
(`applyChanges` in the same file; `test/fake.ts` counts it as one edit).

**It writes one thing into a file on its own, only with a setting on.**
With "Remember folds in the file" on (off by default), the `%% fold %%`
marker is appended to a folded item's line and removed on unfold. Two
paths, both through the editor, never through `Vault.modify`:
`src/operations/foldMarker.ts` puts the marker into the text an operation
writes anyway, and `src/editor/foldMarkers.ts` is a transaction filter
that appends the change to a fold made outside the plugin (the fold
gutter, Obsidian's own fold commands, and Obsidian's restore of
remembered folds on open), inside that transaction.
`test/editor-layer.test.mjs` runs the filter against a real editor state.
With the setting off, nothing is written; markers already in a file are
read (`markedFoldLines`) and the folds applied on open, through fold
effects.

**It folds and unfolds through the editor's fold effects.** `adapter.ts`
and `foldMarkers.ts` dispatch `foldEffect` and `unfoldEffect` from
`@codemirror/language`. Nothing is hidden with CSS.

**It reads the editor's syntax tree.** `src/editor/syntax.ts` asks the
editor's own parser which kind of line the cursor is on, and
`src/editor/nodes.ts` reads a `- item` line inside frontmatter, a code
block (fenced or indented), a table, a callout, a quote, an HTML block or
a math block as not a list, so it is left alone.

**It registers keys.** `src/editor/keymap.ts` binds Tab, Shift-Tab, Enter
and Mod-Shift-Enter at `Prec.high` (above the editor's own list keys,
below the Live Preview image editor's; each checks the syntax tree first)
and Backspace, Delete, Mod-Backspace on macOS, ArrowLeft (Ctrl-ArrowLeft
on Windows and Linux), Mod-A, Shift-ArrowUp and Shift-ArrowDown at the
default precedence. `test/hygiene.test.mjs` pins the `Prec.high` set and
refuses `Prec.highest`. Every handler returns false unless the view is
its Editor's own (`src/editor/pairing.ts`, `src/editor/registry.ts`), so
a Live Preview table cell keeps its own keys.

**It registers a keyboard scheme.** `src/editor/schemeKeymap.ts` binds
the active scheme's chords (`src/editor/schemes.ts`, Tana or Heptabase,
or nothing) at the default precedence; each runs the operation the
command of the same id runs and returns false outside a list, so the
key reaches the editor. A change of scheme swaps the extension through
`Workspace.updateOptions()`. No chord is one of Obsidian's own default
hotkeys, except two that the table names as taken (Mod+Enter, Mod+D)
with a free second chord each; `test/schemes.test.mjs` checks every
chord against the 1.13.7 tables in `test/lib/obsidian-1.13.7-keys.mjs`.

**It registers two transaction filters.** `src/editor/cursorStick.ts`
moves a cursor that landed inside a bullet or a folded block, inside the
same transaction. `src/editor/foldMarkers.ts` is the marker filter
above. Both step aside in a view that is not its Editor's own. Keys and
filters are switched off per feature in settings.

**It listens to the mouse on desktop.** `src/editor/dragDrop.ts` registers
three listeners per window document (`mousemove`, `mouseup`, and
`keydown` for Escape) through `Plugin.registerDomEvent`, so they are
released on unload; each returns at once while no drag is live. Geometry
comes from the view's public API (`posAtCoords`, `coordsAtPos`,
`lineBlockAt`); the drop line is one element positioned through CSS
custom properties; no class name of the editor's DOM is read. Not
registered on mobile. `test/hygiene.test.mjs` pins `registerDomEvent`,
refuses `addEventListener` and the global `document`.

**It opens one modal.** `src/editor/moveToModal.ts` is a
`FuzzySuggestModal` over the headings and list items of the current
file, built from the editor's lines (`src/moveTo.ts`) and nothing else.

**It registers thirteen commands.** `src/commands.ts`, from the table in
`src/commandTable.ts`: bare ids, sentence case, an icon each, no default
hotkeys (`test/manifest.test.mjs` pins all four). An Obsidian hotkey is
captured at window level before any editor key and fires in every
editor, list or not; the schemes above are editor keys instead, and a
hotkey the user sets on a command runs first.

**It stores nine settings.** `data.json` holds the nine keys listed in
`src/settings/model.ts`, normalised on every read. No document text is
ever written there.

**It makes no network connection.** No `fetch`, `requestUrl`,
`XMLHttpRequest` or `WebSocket` anywhere in `src/`;
`test/hygiene.test.mjs` pins it.

**It reads no file and spawns nothing.** No import from `fs`,
`child_process`, `path` or `os`; no `process` global; the same test pins
each.

**It logs only when asked.** With "Debug logging" on (off by default),
`src/log.ts` writes one line per key press to the developer console
naming the action and the reason it did or did not run. Document text is
never logged.

## What a review should look at

1. That `src/editor/adapter.ts` and `src/editor/foldMarkers.ts` are the
   only modules that change document text, and that they do so with
   `replaceRange`, `transaction`, `setSelection` and a change appended to
   a fold transaction, nothing else.
2. That nothing in `src/` reaches a private field of Obsidian or of the
   editor (`test/hygiene.test.mjs` lists the names it refuses).
3. That `src/editor/dragDrop.ts` registers its listeners through
   `registerDomEvent` only, on the document of the editor's own window
   (same test).
4. That the built `main.js` requires `obsidian` and the three
   `@codemirror` packages and bundles nothing else (same test).
5. That the mutation runs in `test/mutate.mjs` still turn every guard red.

## Obsidian's own guidance

This plugin declares `isDesktopOnly: false`; nothing in it depends on the
desktop. The developer policies require disclosure of network use and of
access to files outside the vault; this plugin does neither.
