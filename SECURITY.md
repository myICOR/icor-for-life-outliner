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

**It edits the active editor, and only through the documented editor API.**
`src/editor/adapter.ts` is the one place the plugin touches an editor. It
reads lines and selections, and writes with `replaceRange` and
`setSelection`. Every operation issues at most one `replaceRange`
(`test/fixtures.test.mjs` pins that per case), which is also what keeps
undo to one step per key.

**It folds and unfolds through the editor's fold effects.** The same file
dispatches `foldEffect` and `unfoldEffect` from `@codemirror/language`.
Nothing is hidden with CSS.

**It reads the editor's syntax tree.** `src/editor/syntax.ts` asks the
editor's own parser which kind of line the cursor is on, so a `- item`
line inside frontmatter, a code block, a table or a callout is left alone.

**It registers keys and a transaction filter.** `src/editor/keymap.ts`
binds Tab, Shift-Tab, Enter (highest precedence, each checking the syntax
tree first), Backspace, Delete, Mod-Backspace on macOS, ArrowLeft and
Mod-A (default precedence). `src/editor/cursorStick.ts` moves a cursor
that landed inside a bullet or a folded block, inside the same
transaction. Both are switched off per key in settings.

**It stores five settings.** `data.json` holds the five keys listed in
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

1. That `src/editor/adapter.ts` is the only module that writes to an
   editor, and that it writes with `replaceRange` and `setSelection` only.
2. That nothing in `src/` reaches a private field of Obsidian or of the
   editor (`test/hygiene.test.mjs` lists the names it refuses).
3. That the built `main.js` requires `obsidian` and the three
   `@codemirror` packages and bundles nothing else (same test).
4. That the mutation runs in `test/mutate.mjs` still turn every guard red.

## Obsidian's own guidance

This plugin declares `isDesktopOnly: false`; nothing in it depends on the
desktop. The developer policies require disclosure of network use and of
access to files outside the vault; this plugin does neither.
