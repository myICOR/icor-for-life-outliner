# ICOR for Life - Outliner

Lists that behave like an outline. Tab, Shift-Tab, Enter, Backspace,
Delete and the arrow keys know that a bullet has children, the cursor stays
in the content, and select-all climbs from the item to the list. Six
commands carry the same behaviour to the command palette and the mobile
toolbar.

The plugin changes how the keys behave and nothing about how a list looks.
Bullets, indent guides and fold markers stay the theme's; the ICOR for Life
- INKLINE theme draws them, and any other theme keeps its own.

**Beta release.** Runs on desktop and mobile. If something looks off, open
an issue.

## What this plugin does on your machine, stated plainly

- **It edits the note you are typing in**, through the editor's own API,
  one edit per key press, so undo stays one step per key.
- **It reads the editor's syntax tree** to know a list line from a table,
  a code block, a callout or frontmatter.
- **It makes no network connection, reads no file, spawns nothing.**
  `SECURITY.md` names the file to read behind every claim.

## The keys

Every key below works on the item under the cursor and everything under
it. "Content" is the text after the bullet and, by default, after the task
box. A key that has nothing to do steps aside and the editor's own
behaviour runs.

| Key | In a list, this plugin | When it steps aside |
| --- | --- | --- |
| Tab | Moves the item with its children under the previous sibling, as its last child. Indentation comes from the sibling's children, then from the item itself, then from elsewhere in the list, then from the editor's indent unit. Ordered lists count again. A folded target is unfolded. | No previous sibling: the key is swallowed and nothing moves. A selection across two items. A list that mixes tabs and spaces. |
| Shift-Tab | Moves the item with its children out to right after its parent. Siblings that followed it stay with the parent. | At the top level the key is swallowed. |
| Enter | Splits the line at the cursor. At the end of an item with children, the new item is the first child. Mid-line, the tail and the children follow the new item. On a folded item, the children stay folded and the new item lands after them. An empty nested item is outdented instead of doubled. A task box is carried over, unchecked. Ordered lists count again. | The cursor inside the bullet. An empty top-level item (the editor removes the bullet). A selection. Inside a code block, a table, a callout or frontmatter. |
| Backspace | At the content start of a notes line: joins the line above. At the content start of an item: merges into the item above only when both are empty, or the one above is empty at the same level, or this one is empty under its parent; the children of the item that disappears move to the one that stays. In every other case at the content start the key is swallowed: Backspace never eats a bullet. | Anywhere else in the line. An empty first item of a list (so the bullet can be deleted). |
| Delete | At the end of a line inside an item: joins the next notes line. At the end of an item: merges the next item in, under the same rule as Backspace. | Anywhere else. A folded item never merges what it hides. |
| Mod-Backspace (macOS) | Deletes back to the content start and stops there. | A selection. |
| ArrowLeft (Ctrl-ArrowLeft on Windows and Linux) | At the content start: jumps to the end of the previous visible line, which is the folded item when the line above is hidden. | Anywhere else. |
| Mod-A | First the item's content, then the item with its children, then the whole list. | From the whole list, or a selection that already reaches outside it: the editor's select all. |
| Any cursor move | A cursor that lands inside a bullet, a task box or a folded block is moved to the content start, or to the end of the folding line, inside the same transaction. | Off when "Keep the cursor in the content" is Never. Ranges are never touched. |

Two keys pass through on purpose: Shift-Enter, where the editor already
starts a notes line under the item, and Enter on an empty top-level item,
where the editor already removes the bullet.

## Commands

All under "ICOR for Life - Outliner" in the command palette. None has a
default hotkey; the table suggests some. Each has an icon, so it can be
added to the mobile toolbar.

| Command | What it does | Suggested hotkey |
| --- | --- | --- |
| Fold the list item | Folds the item under the cursor, through the editor's own folding. Needs "Fold indent" on under Settings, Editor. | Mod+Alt+ArrowUp |
| Unfold the list item | Unfolds it. | Mod+Alt+ArrowDown |
| Move the list item up | Swaps the item with its previous sibling, subtree and folds included. At the first position it joins the previous parent as its last child. | Mod+Shift+ArrowUp |
| Move the list item down | Mirror: after the next sibling, or into the next parent as its first child. | Mod+Shift+ArrowDown |
| Indent the list item | Same as Tab. | (Tab) |
| Outdent the list item | Same as Shift-Tab. | (Shift+Tab) |

The suggested fold hotkeys avoid Mod+ArrowUp and Mod+ArrowDown, which on
macOS move to the start and end of the document.

## Mobile

Phones and tablets have no Tab key. Under Settings, Toolbar, add the six
commands above; they appear with their icons. Everything else (Enter,
Backspace, Delete, the cursor rules) works from the soft keyboard as it
does on desktop.

## Settings

| Setting | Default | What it governs |
| --- | --- | --- |
| Keep the cursor in the content | After the bullet and the checkbox | Where the cursor may stand on a list line, and with it Backspace, Delete, Mod-Backspace and ArrowLeft at the content start. "After the bullet" treats the task box as content. "Never" switches all of it off. |
| Tab moves the whole item | On | Tab and Shift-Tab. |
| Enter knows about children | On | Enter. |
| Select all climbs | On | Mod-A. |
| Debug logging | Off | One line per key press in the developer console: the action and why it did or did not run. Never the text. |

The settings appear in Obsidian's settings search.

## Two outliners at once

If another plugin in your vault also binds Tab and Enter inside lists,
disable one of them. Both bind at the highest precedence and whichever
loaded first wins, without a message. Custom hotkeys set on that other
plugin's commands do not carry over; set them again on the six commands
above.

## Whitespace is never normalised

A two-space list stays two-space, a tab list stays tab, a four-space list
stays four-space. Every operation writes back only the lines it changed,
byte for byte on the rest. A list that mixes tabs and spaces is left alone
by every key rather than guessed at. Ordered lists are the one place the
plugin rewrites lines it did not move: every run of numbered siblings
counts from 1 after a structural change.

## Development

```
npm install
npm run gate
npm run mutate
```

The gate is typecheck, build, lint (the same `eslint-plugin-obsidianmd`
rules the directory runs, plus the CSS scanner) and the test suite. The
suite has three parts: the pure-layer tests (`test/model.test.mjs`), the
fixture corpus (`test/fixtures/*.txt`, one document, one key, the
document afterwards, run through a fake editor that counts edits), and
the repo gates (`test/manifest.test.mjs`, `test/hygiene.test.mjs`).

`npm run mutate` breaks one guard at a time in a copy of the source (the
fold re-apply, the indent fallback chain, the task-box carry, the
code-fence bail, the single-cursor guard, the non-list-node check, the
merge safety rule, the mixed-indentation refusal, the one-edit promise)
and records which cases go red. A guard no case catches fails the run.
The record for the current version is `docs/mutation-runs.md`.

### Layout

| Folder | What lives there | Imports |
| --- | --- | --- |
| `src/model/` | The list as a tree, the line grammar, the parser, the printer. | nothing |
| `src/operations/` | One pure operation per key, each returning `{ updated, consume }`. | model |
| `src/apply/` | The editor interface, the line diff, the applicator (one edit, fold reconcile, selection). | model |
| `src/actions.ts` | The one door: guards, parse, operate, apply. | all of the above |
| `src/editor/` | The CodeMirror adapter, the syntax probe, the keymaps, the cursor filter, the view registry. | obsidian, @codemirror |
| `src/commands.ts`, `src/settings/`, `src/main.ts` | The plugin surface. | obsidian |

### Where the next features go

- **Drag and drop.** A `ViewPlugin` in `src/editor/` that turns pointer
  geometry into a `move-to` operation in `src/operations/` (the tree
  already has `detach` and `attach`; a drop is one of each plus
  `setIndent`), applied through `actions.ts` like every other change.
  Listeners per window through `registerDomEvent`, positions through the
  view's own coordinate methods, one `replaceRange` at the drop.
- **Guide lines.** A second `ViewPlugin` in `src/editor/` drawing into an
  overlay on the view, with its rules in `styles.css` under the
  `icor-outliner-` prefix on `--ink-*` or Obsidian variables.
- **Block-outliner behaviours.** New operations in `src/operations/`, new
  `ActionId` values in `actions.ts`, keys in `src/editor/keymap.ts` or
  commands in `src/commands.ts`, a fixture file each, and a mutation each.
- **A new setting.** One key in `src/settings/model.ts`, one row in
  `src/settings/definitions.ts`; the settings test refuses anything else.

A release is a bare version tag (`0.1.0`, no `v`) pushed to `main`.
`.github/workflows/release.yml` runs the gate and the mutation runs on the
tagged commit, checks the tag equals the manifest version, attests
`main.js`, `manifest.json` and `styles.css` with GitHub artifact
attestations, and publishes the release with those three assets and the
notes from `docs/releases/<version>.md`.

## Licence

ICOR for Life Source-Available License (Code), Version 1.0. See `LICENSE`.
