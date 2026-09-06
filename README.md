# ICOR for Life - Outliner

Lists that behave like an outline. Tab, Shift-Tab, Enter, Backspace,
Delete and the arrow keys know that a bullet has children, the cursor stays
in the content, Shift-Up and Shift-Down select whole items, and select-all
climbs from the item to the list. Thirteen commands carry the same
behaviour to the command palette and the mobile toolbar, and on desktop a
bullet can be dragged with everything under it.

The plugin changes how the keys behave and, apart from a drop line while
you drag, nothing about how a list looks. Bullets, indent guides and fold
markers stay the theme's; the ICOR for Life - INKLINE theme draws them,
and any other theme keeps its own.

**Beta release.** Runs on desktop and mobile. If something looks off, open
an issue.

## What this plugin does on your machine, stated plainly

- **It edits the note you are typing in**, through the editor's own API,
  one edit per key press, so undo stays one step per key. Moving an item
  to another list in the same file is one transaction with two spans, and
  still one undo step.
- **It reads the editor's syntax tree** to know a list line from a table,
  a code block, a callout or frontmatter.
- **It writes one thing into your files only if you switch it on:** the
  `%% fold %%` marker described under "Folds that survive a reinstall".
  Off by default.
- **It makes no network connection, reads no file, spawns nothing.**
  `SECURITY.md` names the file to read behind every claim.

## The keys

Every key below works on the item under the cursor and everything under
it. "Content" is the text after the bullet and, by default, after the task
box. A key that has nothing to do steps aside and the editor's own
behaviour runs.

| Key | In a list, this plugin | When it steps aside |
| --- | --- | --- |
| Tab | Moves the item with its children under the previous sibling, as its last child. Indentation comes from the sibling's children, then from the item itself, then from elsewhere in the list, then from the editor's indent unit. Ordered lists count again. A folded target is unfolded. With whole items selected, every selected item goes. | No previous sibling: the key is swallowed and nothing moves. A selection that is not whole items. A list that mixes tabs and spaces. |
| Shift-Tab | Moves the item with its children out to right after its parent. Siblings that followed it stay with the parent. With whole items selected, every selected item leaves. | At the top level the key is swallowed. |
| Enter | Splits the line at the cursor. At the end of an item with children, the new item is the first child. Mid-line, the tail and the children follow the new item. On a folded item, the children stay folded and the new item lands after them. An empty nested item is outdented instead of doubled. A task box is carried over, unchecked. Ordered lists count again. | The cursor inside the bullet. An empty top-level item (the editor removes the bullet). A selection. Inside a code block, a table, a callout or frontmatter. |
| Mod-Shift-Enter | Inserts an empty item above the current one, same indent, same bullet, task box carried over unchecked, and moves the cursor into it. The current item is not touched, wherever the cursor stood. Ordered lists count again. | A selection. Same places as Enter. |
| Shift-Down, Shift-Up | Select whole items. From a cursor, Shift-Down selects the item and the next sibling, each with its subtree, column zero to the end; Shift-Up selects the item and the previous one. Then each press moves the selection's head one sibling further or one back, the way a text selection grows and shrinks. With whole items selected, Tab, Shift-Tab, move up, move down, delete with subtree, duplicate, toggle done, expand all and collapse all work on every selected item as one change and one undo step, and the selection stays on them. | A selection that is not whole items. At the first or last sibling the key is swallowed. Outside a list. |
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
default hotkey. Each has an icon, so it can be added to the mobile
toolbar. Every command that moves or changes an item works on the item
under the cursor, from any column of any of its lines, and on every item
of a whole-item selection.

| Command | What it does |
| --- | --- |
| Fold the list item | Folds the item under the cursor, through the editor's own folding. Needs "Fold indent" on under Settings, Editor. |
| Unfold the list item | Unfolds it. |
| Expand all under the list item | Unfolds the item and every level under it, in one call. |
| Collapse all under the list item | Folds the item and every level under it, in one call. A cursor on a line about to be hidden moves to the end of the item's line. |
| Move the list item up | Swaps the item with its previous sibling, subtree and folds included. At the first position it joins the previous parent as its last child. |
| Move the list item down | Mirror: after the next sibling, or into the next parent as its first child. |
| Indent the list item | Same as Tab. |
| Outdent the list item | Same as Shift-Tab. |
| Insert a list item above | Same as Mod-Shift-Enter. |
| Delete the list item with its subtree | Removes the item and every descendant in one change. The cursor lands at the content start of the item that followed, or the one before, or in an empty item left in place when nothing else remains. The Backspace rule above is unchanged; this is the deliberate one-shot cut. |
| Duplicate the list item with its subtree | A copy of the item with everything under it, notes lines, task boxes and folds included, right after the original at the same indent. The cursor goes to the start of the copy's content; after a whole-item selection the copies stay selected. Ordered lists count again. |
| Toggle done on the list item | Adds `[x]` to an item without a task box; swaps `[ ]` and `[x]` otherwise, and turns any other state (`[-]`, `[/]`) into `[ ]`. The cursor keeps its character. Children are not touched. |
| Move the list item to... | Opens a picker of every heading and list item in the current file, indented by depth. The item with its subtree becomes the last child of the chosen item, or the last top-level item of the list at the end of the chosen heading's section (a list is started there when the section has none). Folds travel, the cursor lands on the moved item. Same file only; across files, cut and paste. A target inside the moved item is refused. |

### Suggested hotkeys

Set them under Settings, Hotkeys. These are suggestions, not defaults:
the plugin binds nothing, so nothing collides until you decide.

| Command | Suggested |
| --- | --- |
| Fold the list item | Mod+Alt+ArrowUp |
| Unfold the list item | Mod+Alt+ArrowDown |
| Collapse all under the list item | Mod+Alt+Shift+ArrowUp |
| Expand all under the list item | Mod+Alt+Shift+ArrowDown |
| Move the list item up | Mod+Shift+ArrowUp |
| Move the list item down | Mod+Shift+ArrowDown |
| Delete the list item with its subtree | Mod+Shift+Backspace |
| Duplicate the list item with its subtree | Mod+Shift+D |
| Toggle done on the list item | Mod+Shift+L. Two chords that look natural are taken by Obsidian itself: Mod+L is "Toggle checkbox status" and Mod+Enter is "Open link under cursor in new tab" (both read from the 1.13.7 command list). Mod+Shift+L is free. |
| Move the list item to... | Mod+Shift+M |
| Insert a list item above | (Mod+Shift+Enter is already the key; the command exists for the toolbar) |
| Indent, Outdent | (Tab, Shift+Tab are already the keys) |

The suggested fold hotkeys avoid Mod+ArrowUp and Mod+ArrowDown, which on
macOS move to the start and end of the document. None of the suggestions
above is a default hotkey of Obsidian 1.13.7; Mod+D (delete paragraph)
and Mod+Alt+ArrowLeft/Right (navigate back and forward) are, which is
why duplicate suggests Mod+Shift+D and the folds use Up and Down.

## Mouse

On desktop, press on a bullet and drag: the item with everything under it
follows a drop line to its new place in the same list. Before or after any
item; into an item as its first child when the item already has children
(the line sits between it and its first child), or when the item has none
and the pointer sits to the right of its content. A folded item takes the
drop after it, never inside. Escape cancels. If the note changed while
you were dragging (sync, another window), nothing moves and a notice says
so. A click on a bullet without dragging puts the cursor into the item.
The drop is one edit and one undo step. Off under Settings, Mouse, "Drag
and drop"; the setting is not shown on phones and tablets, where the
feature does not exist. Pop-out windows work like the main one: the
listeners a window needs are set up on the first press on a bullet in
it, because an editor moved into a pop-out keeps its view.

## Mobile

Phones and tablets have no Tab key and no mouse. Under Settings, Toolbar,
add any of the thirteen commands; they appear with their icons:

fold, unfold, expand all, collapse all, move up, move down, indent,
outdent, insert above, delete with subtree, duplicate, toggle done,
move to.

Everything else (Enter, Backspace, Delete, the cursor rules) works from
the soft keyboard as it does on desktop.

## Settings

| Setting | Default | What it governs |
| --- | --- | --- |
| Keep the cursor in the content | After the bullet and the checkbox | Where the cursor may stand on a list line, and with it Backspace, Delete, Mod-Backspace and ArrowLeft at the content start. "After the bullet" treats the task box as content. "Never" switches all of it off. |
| Tab moves the whole item | On | Tab and Shift-Tab. |
| Enter knows about children | On | Enter and Mod-Shift-Enter. |
| Select all climbs | On | Mod-A. |
| Shift-Up/Down selects whole items | On | Shift-Up and Shift-Down. |
| Drag and drop | On (desktop only) | Dragging a bullet with the mouse. Hidden on mobile. |
| Remember folds in the file | Off | The `%% fold %%` marker, below. |
| Debug logging | Off | One line per key press in the developer console: the action and why it did or did not run. Never the text. |

Commands are never switched off by a setting. The settings appear in
Obsidian's settings search.

## Folds that survive a reinstall

Obsidian keeps which items are folded in its own local memory, which a
reinstall, a new device and every sync tool leave behind. With "Remember
folds in the file" on, folding an item appends an Obsidian comment to the
end of that item's line:

```
- a folded item %% fold %%
  - hidden child
```

and unfolding removes it. The comment is invisible in reading view. On
open, the plugin reads the markers and applies the folds itself. The
marker is written for folds made with the keyboard, the commands, the
fold gutter and Obsidian's own fold commands alike, in the same edit as
the fold, so undo stays one step.

It is off by default because every fold then changes the file, which is
a diff in a vault under version control. With the setting off, no marker
is ever written and markers already in a file are left alone but still
honoured on open, so a note that was marked on one device folds the same
way on another. Two things to know: the marker sits at the very end of
the line, so text typed at the end of a folded item goes after it (unfold,
type, fold, and the marker follows); and with the setting on, the next
edit in a list also writes markers for items that were already folded
without one, so the file catches up.

## Two outliners at once

If another plugin in your vault also binds Tab and Enter inside lists,
disable one of them. Both bind at a high precedence and whichever loaded
first wins, without a message. Custom hotkeys set on that other plugin's
commands do not carry over; set them again on the commands above.

This plugin's Tab, Shift-Tab, Enter and Mod-Shift-Enter sit above the
editor's own list handling and below the Live Preview image editor, so
with an image selected inside an item, Enter still opens the image's
link editor and Tab still edits its alias.

## Known limits

- **Android composing keyboards.** Enter and Tab run while the keyboard
  is still composing a word (Gboard composes every word). On desktop the
  plugin waits for the composition to end; on Android it does not, so
  the split may land before the suggestion strip commits the word. If
  the composed word is lost, the fix is to let the editor's own Enter
  run while composing, on every platform; report it and it ships.
- **Table cells.** Inside a Live Preview table cell the plugin steps
  aside entirely: Tab and Enter are the table's, the cursor is not moved,
  and the commands act on the note, not the cell.
- **Folding needs "Fold indent".** Fold, unfold, expand all and collapse
  all go through the editor's own folding, which exists only while
  Settings, Editor, "Fold indent" is on. Off, the commands show a notice
  and do nothing.
- **Same file only.** Move to and drag and drop stay inside the current
  file; across files, cut and paste.

## Whitespace is never normalised

A two-space list stays two-space, a tab list stays tab, a four-space list
stays four-space. Every operation writes back only the lines it changed,
byte for byte on the rest. A list that mixes tabs and spaces is left alone
by every key rather than guessed at. Ordered lists are the one place the
plugin rewrites lines it did not move: every run of numbered siblings
counts from 1 after a structural change. A blank line between two lists
makes them one loose list, the way Markdown reads them; move-to and drag
treat them as one.

## Development

```
npm install
npm run gate
npm run mutate
```

The gate is typecheck, build, lint (the same `eslint-plugin-obsidianmd`
rules the directory runs, plus the CSS scanner) and the test suite. The
suite has three parts: the pure-layer tests (`test/model.test.mjs`), the
fixture corpus (`test/fixtures/*.txt`, one document, one key or command,
the document afterwards, run through a fake editor that counts edits),
and the repo gates (`test/manifest.test.mjs`, `test/hygiene.test.mjs`).

A fixture is `--- given`, the document with `‸` for the cursor, `⟨` `⟩`
for a selection and ` ⊟` for a folded line; `--- when key <Key>`,
`--- when command <id>`, `--- when move-to <line>` or
`--- when drop <line> <before|after|child> <line>`; and `--- then`, the
document afterwards. Options on the `given` line switch settings
(`markers=on`, `select=off`, `stick=never`, `unit=tab`).

`npm run mutate` breaks one guard at a time in a copy of the source and
records which cases go red: the fold re-apply, the indent fallback chain
and each of its links, the task-box carry, the code-fence bail, the
single-cursor guard, the non-list-node check, the merge safety rule, the
mixed-indentation refusal, the whole-item test, the Shift-Down reach and
head, Tab and move over every selected item, insert-above's position,
delete-with-subtree's children, duplicate's folds, expand and collapse
depth, toggle-done's swap, move-to's last-child attach and cross-list
line shift, the fold marker write and strip, the drop's child placement,
its step order and its inside refusal, and the one-edit promise. A guard
no case catches fails the run. The record for the current version is
`docs/mutation-runs.md`.

### Layout

| Folder | What lives there | Imports |
| --- | --- | --- |
| `src/model/` | The list as a tree, the line grammar, the parser, the printer. | nothing |
| `src/operations/` | One pure operation per key or command, each returning `{ updated, consume }`; the whole-item selection; the drop; the fold marker. | model |
| `src/apply/` | The editor interface, the line diff, the applicator (one edit, fold reconcile, selection; `applyChanges` for a two-span move). | model |
| `src/actions.ts`, `src/moveTo.ts` | The doors: guards, parse, operate, fold-marker sync, apply. `runAction` for keys and commands, `runDrop` for a drop, `runMoveTo` and `moveTargets` for the picker. | all of the above |
| `src/editor/` | The CodeMirror adapter, the syntax probe, the keymaps, the cursor filter, the view registry, the fold-marker filter, the drag plugin, the move-to modal. | obsidian, @codemirror |
| `src/commands.ts`, `src/settings/`, `src/main.ts` | The plugin surface. | obsidian |

### Where the next features go

- **Guide lines.** A `ViewPlugin` in `src/editor/` drawing into an
  overlay on the view, with its rules in `styles.css` under the
  `icor-outliner-` prefix on Obsidian variables, the way the drop line is.
- **Drag between lists.** `runDrop` moves within one list; a drop onto
  another list is a `runMoveTo` with the target from the pointer, and the
  two-span transaction already exists.
- **Vim bullets, a zoom hook.** Left out on purpose; see the feasibility
  brief.
- **A new operation.** A file in `src/operations/`, an `ActionId` in
  `actions.ts`, a key in `src/editor/keymap.ts` or a command in
  `src/commands.ts`, a fixture file, and a mutation in `test/mutate.mjs`.
- **A new setting.** One key in `src/settings/model.ts`, one row in
  `src/settings/definitions.ts` (`desktopOnly` hides it on mobile); the
  settings test refuses anything else.

A release is a bare version tag (`0.1.0`, no `v`) pushed to `main`.
`.github/workflows/release.yml` runs the gate and the mutation runs on the
tagged commit, checks the tag equals the manifest version, attests
`main.js`, `manifest.json` and `styles.css` with GitHub artifact
attestations, and publishes the release with those three assets and the
notes from `docs/releases/<version>.md`.

## Licence

ICOR for Life Source-Available License (Code), Version 1.0. See `LICENSE`.
