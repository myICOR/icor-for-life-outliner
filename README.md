# ICOR for Life - Outliner

Lists that behave like an outline. Tab, Shift-Tab, Enter, Backspace,
Delete and the arrow keys know that a bullet has children, the cursor stays
in the content, Shift-Up and Shift-Down select whole items, and select-all
climbs from the item to the list. A keyboard scheme, Tana or Heptabase,
folds, moves, deletes, duplicates and marks an item from the keyboard;
thirteen commands carry the same behaviour to the command palette and
the mobile toolbar; and on desktop a bullet can be dragged with
everything under it.

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
  a code block, a callout, a quote, an HTML block, a math block or
  frontmatter.
- **It writes one thing into your files only if you switch it on:** the
  `%% fold %%` marker described under "Folds that survive a reinstall",
  written when an item is folded or unfolded, when a note is opened whose
  folds Obsidian remembers but the file does not, and on the next edit in
  a list that holds such a fold. Off by default.
- **It makes no network connection, reads no file, spawns nothing.**
  `SECURITY.md` names the file to read behind every claim.

## How do I collapse bullets?

Four ways, all through the editor's own folding, which exists only while
"Fold indent" is on under Settings, Editor (off, the fold commands show a
notice and do nothing):

- **The chevron in the gutter** next to a bullet that has children, on
  hover. Obsidian draws it; the plugin does not touch it.
- **The Fold key**, Mod+ArrowUp on the item in both keyboard schemes
  (Mod+ArrowDown unfolds). It works from any line of the item, notes
  lines included; outside a list the same key still goes to the start of
  the note.
- **Collapse all under the list item**, Control+Cmd+ArrowUp on macOS and
  Ctrl+Alt+ArrowUp on Windows and Linux, folds the item and every level
  under it in one go; Expand all, the same with ArrowDown, opens them
  all.
- **A whole-item selection** (Shift-Down, Shift-Up) and then Fold,
  Collapse all or Expand all works on every selected item at once.

Folds live in Obsidian's local memory unless "Remember folds in the
file" is on (see below). The vertical guide lines beside a nested list
are not part of this plugin: the theme draws them, and the ICOR for Life
- INKLINE theme draws them for this plugin's lists.

## The keys

Every key below works on the item under the cursor and everything under
it. "Content" is the text after the bullet and, by default, after the task
box. A key that has nothing to do steps aside and the editor's own
behaviour runs.

| Key | In a list, this plugin | When it steps aside |
| --- | --- | --- |
| Tab | Moves the item with its children under the previous sibling, as its last child. Indentation comes from the sibling's children, then from the item itself, then from elsewhere in the list, then from the editor's indent unit. Ordered lists count again. A folded target is unfolded. With whole items selected, every selected item goes. | No previous sibling: the key is swallowed and nothing moves. A selection that is not whole items. A list that mixes tabs and spaces. |
| Shift-Tab | Moves the item with its children out to right after its parent. Siblings that followed it stay with the parent. With whole items selected, every selected item leaves. | At the top level the key is swallowed. |
| Enter | Splits the line at the cursor. At the end of an item with children, the new item is the first child. Mid-line, the tail and the children follow the new item. On a folded item, the children stay folded and the new item lands after them. An empty nested item is outdented instead of doubled. A task box is carried over, unchecked. Ordered lists count again. | The cursor inside the bullet. An empty top-level item (the editor removes the bullet). A selection. Inside a code block (fenced or indented), a table, a callout, a quote, an HTML block, a math block or frontmatter. |
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
default hotkey: the keyboard scheme below binds ten of them as editor
keys that work inside a list only, and a hotkey you set on any command
under Settings, Hotkeys runs first, in every note. Each has an icon, so
it can be added to the mobile toolbar. Every command that moves or changes an item works on the item
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

## Keyboard schemes

Under Settings, "Keyboard scheme": **Tana** (the default), **Heptabase**,
or **Obsidian hotkeys only**. A scheme is a set of editor keys, not
Obsidian hotkeys: each one works inside a list and steps aside outside
one, so Mod+ArrowUp folds an item and still goes to the start of the
note anywhere else. Switching the scheme takes effect in every open
editor at once. Mod is Cmd on macOS and Ctrl on Windows and Linux.

Any of these can be overridden per command under Settings, Hotkeys;
search for "ICOR for Life - Outliner". A hotkey set there runs first, in
every note, list or not. The plugin's settings page lists the active
scheme's chords under "Keyboard shortcuts".

The tables are Pax's recommended schemes (2026-09-06), as shipped.

### Tana

| Action | macOS | Windows, Linux |
| --- | --- | --- |
| Fold the list item | Cmd+ArrowUp | Ctrl+ArrowUp |
| Unfold the list item | Cmd+ArrowDown | Ctrl+ArrowDown |
| Collapse all under the list item | Control+Cmd+ArrowUp | Ctrl+Alt+ArrowUp |
| Expand all under the list item | Control+Cmd+ArrowDown | Ctrl+Alt+ArrowDown |
| Move the list item up | Cmd+Shift+ArrowUp | Ctrl+Shift+ArrowUp |
| Move the list item down | Cmd+Shift+ArrowDown | Ctrl+Shift+ArrowDown |
| Delete the list item with its subtree | Cmd+Shift+Backspace | Ctrl+Shift+Backspace |
| Duplicate the list item with its subtree | Cmd+Shift+D | Ctrl+Shift+D |
| Toggle done on the list item | Cmd+Enter, and Cmd+Shift+L | Ctrl+Enter, and Ctrl+Shift+L |
| Move the list item to... | Cmd+Shift+M | Ctrl+Shift+M |

### Heptabase

The same as Tana except duplicate, which is Heptabase's own Cmd+D /
Ctrl+D. Heptabase documents few list chords: it has no separate fold and
unfold (one toggle on Mod+Enter does both there, and marks a task), no
collapse all or expand all, no insert above, no keyboard whole-item
selection and no same-file move, so the Heptabase scheme borrows Tana's
chord for each of those. Delete with subtree borrows Tana's
Backspace-based chord too, because Heptabase's Delete key behaviour on
a block with children is undocumented and a MacBook keyboard has no
forward Delete without Fn.

| Action | macOS | Windows, Linux |
| --- | --- | --- |
| Fold the list item | Cmd+ArrowUp | Ctrl+ArrowUp |
| Unfold the list item | Cmd+ArrowDown | Ctrl+ArrowDown |
| Collapse all under the list item | Control+Cmd+ArrowUp | Ctrl+Alt+ArrowUp |
| Expand all under the list item | Control+Cmd+ArrowDown | Ctrl+Alt+ArrowDown |
| Move the list item up | Cmd+Shift+ArrowUp | Ctrl+Shift+ArrowUp |
| Move the list item down | Cmd+Shift+ArrowDown | Ctrl+Shift+ArrowDown |
| Delete the list item with its subtree | Cmd+Shift+Backspace | Ctrl+Shift+Backspace |
| Duplicate the list item with its subtree | Cmd+D, and Cmd+Shift+D | Ctrl+D, and Ctrl+Shift+D |
| Toggle done on the list item | Cmd+Enter, and Cmd+Shift+L | Ctrl+Enter, and Ctrl+Shift+L |
| Move the list item to... | Cmd+Shift+M | Ctrl+Shift+M |

### The same in every scheme

Tab, Shift-Tab, Enter, Mod-Shift-Enter (insert above), Backspace,
Delete, Mod-Backspace, ArrowLeft, Mod-A, Shift-Up and Shift-Down are
the editing keys of "The keys" above; they do not change with the
scheme, and the toggles under Settings switch them. Zoom, go to parent,
next and previous sibling and first and last item are unbound in both
schemes: neither tool documents a chord for them, and none is invented.

### Two chords Obsidian takes first

Mod+Enter is Obsidian's own "Open link under cursor in new tab" and
Mod+D its "Delete paragraph", both default hotkeys of Obsidian 1.13.7.
An Obsidian hotkey is captured at window level before any editor key
and consumes the chord whether or not its command did anything, so
inside a list Mod+Enter reaches this plugin only after you remove that
hotkey under Settings, Hotkeys (search "Open link under cursor in new
tab"), and Mod+D in the Heptabase scheme only after you remove "Delete
paragraph". Until then the second chord in the table does the same:
Mod+Shift+L toggles done, Mod+Shift+D duplicates. The settings page
says so on the two rows.

Every scheme chord is checked in `test/schemes.test.mjs` against the
1.13.7 default hotkey table and the editor's own keymap, both pinned as
data in `test/lib/obsidian-1.13.7-keys.mjs`: no chord is a core default
except the two above, which must name their taker and carry a free
second chord; and the chords the editor itself binds (Mod+ArrowUp and
ArrowDown, with Shift, on macOS; Ctrl+Alt+ArrowUp and ArrowDown, the
editor's add-cursor keys, on Windows and Linux; Mod+Enter, the editor's
blank-line key, everywhere) are exactly the pinned set, shadowed inside
a list and untouched outside one.

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

| Keyboard scheme | Tana | Which chords fold, move, delete, duplicate and mark an item inside a list: Tana, Heptabase, or none ("Obsidian hotkeys only"). See "Keyboard schemes". |

Two blocks on the page carry no switch: under "Keyboard shortcuts", one
read-only row per command shows what the active scheme binds, printed
the way the Hotkeys page prints a chord, regenerated when the scheme
changes, behind one sentence on overriding any of them under Settings,
Hotkeys; "Editing keys" lists the keys that are not commands (Tab,
Shift-Tab, Enter, Mod-Shift-Enter, Backspace, Delete, Mod-Backspace on
macOS, ArrowLeft, Mod-A, Shift-Up and Shift-Down) with the toggle that
switches each. Commands are never switched off by a setting. Every row
appears in Obsidian's settings search.

## Folds that survive a reinstall

Obsidian keeps which items are folded in its own local memory, which a
reinstall, a new device and every sync tool leave behind. With "Remember
folds in the file" on, folding an item appends an Obsidian comment to the
end of that item's line:

```
- a folded item %% fold %%
  - hidden child
```

and unfolding removes it. It is an Obsidian comment: reading view hides
it, Live Preview and source mode show the word `fold` faint at the end of
the line, the way any comment shows there. On open, the plugin reads the
markers and applies the folds itself. The marker is written for folds
made with the keyboard, the commands, the fold gutter and Obsidian's own
fold commands alike, in the same edit as the fold, so undo stays one
step.

It is off by default because every fold then changes the file, which is
a diff in a vault under version control. With the setting off, no marker
is ever written and markers already in a file are left alone but still
honoured on open, so a note that was marked on one device folds the same
way on another. Three things to know:

- The marker sits at the very end of the line, before a trailing block
  id when the item has one (`- item %% fold %% ^abc`, so `[[note#^abc]]`
  keeps resolving). Text typed at the end of a folded item goes after
  the marker (unfold, type, fold, and the marker follows).
- With the setting on, the file catches up on its own: opening a note
  writes markers for every fold Obsidian already remembers for it (folds
  made before the setting was on, folds made in reading view, folds
  remembered from another device), so a note can change on open before
  you type; and the next edit in a list writes markers for items that
  were folded without one.
- A fold from the gutter is not an undo step, but the marker it writes
  is: Mod-Z right after a gutter fold removes the marker and leaves the
  item folded; the next fold change writes it again.

## Two outliners at once

If another plugin in your vault also binds Tab and Enter inside lists,
disable one of them. Both bind at a high precedence and whichever loaded
first wins, without a message. Custom hotkeys set on that other plugin's
commands do not carry over; set them again on the commands above. The
keyboard scheme's keys are editor keys, so a hotkey you set on any
plugin's command under Settings, Hotkeys runs before them.

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
- **Control+Cmd+ArrowUp and ArrowDown on macOS.** The collapse all and
  expand all chords of both schemes. macOS uses Control+ArrowUp and
  ArrowDown without Cmd for Mission Control and App Windows, so the
  chords should be free, but this is unverified on a machine whose
  Mission Control keys were changed in System Settings; if the system
  takes them, rebind the two commands under Settings, Hotkeys.
- **Ctrl+Alt+ArrowUp and ArrowDown on Linux.** Some desktops use them to
  switch workspaces; where the desktop takes them, the same rebinding
  applies.
- **Mod+Enter and Mod+D.** Obsidian's own hotkeys take them first; see
  "Two chords Obsidian takes first" under "Keyboard schemes".

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
the scheme gates (`test/schemes.test.mjs` over the tables, the scheme
cases in `test/lib/scheme-cases.mjs` driving the keymap through a stub
Editor), and the repo gates (`test/manifest.test.mjs`,
`test/hygiene.test.mjs`). The 1.13.7 default hotkey table and the
editor's own keymap live as data in `test/lib/obsidian-1.13.7-keys.mjs`.

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
its step order and its inside refusal, the one-edit promise, and, on the
editor layer, a scheme key returning false outside a list. A guard no
case catches fails the run. The record for the current version is
`docs/mutation-runs.md`.

### Layout

| Folder | What lives there | Imports |
| --- | --- | --- |
| `src/model/` | The list as a tree, the line grammar, the parser, the printer. | nothing |
| `src/operations/` | One pure operation per key or command, each returning `{ updated, consume }`; the whole-item selection; the drop; the fold marker. | model |
| `src/apply/` | The editor interface, the line diff, the applicator (one edit, fold reconcile, selection; `applyChanges` for a two-span move). | model |
| `src/actions.ts`, `src/moveTo.ts` | The doors: guards, parse, operate, fold-marker sync, apply. `runAction` for keys and commands, `runDrop` for a drop, `runMoveTo` and `moveTargets` for the picker. | all of the above |
| `src/editor/` | The CodeMirror adapter, the syntax probe, the keymaps, the cursor filter, the view registry, the fold-marker filter, the drag plugin, the move-to modal. | obsidian, @codemirror |
| `src/commandTable.ts`, `src/editor/schemes.ts` | The thirteen commands, the editing keys, the chord printer; the two keyboard schemes as tables. | actions (types) |
| `src/commands.ts`, `src/editor/schemeKeymap.ts`, `src/settings/`, `src/main.ts` | The plugin surface. | obsidian |

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
- **A new command.** One row in `src/commandTable.ts`; the registration
  and the settings page read it from there.
- **A new keyboard scheme, or a changed chord.** One table in
  `src/editor/schemes.ts` (a chord per action, macOS and the rest), a
  name in `SCHEME_NAMES`, the id in `SCHEME_IDS`; the keymap, the
  settings dropdown and the read-only rows follow. `test/schemes.test.mjs`
  refuses a chord that is a core default unless the table names the
  taking command and a free second chord.

A release is a bare version tag (`0.1.0`, no `v`) pushed to `main`.
`.github/workflows/release.yml` runs the gate and the mutation runs on the
tagged commit, checks the tag equals the manifest version, attests
`main.js`, `manifest.json` and `styles.css` with GitHub artifact
attestations, and publishes the release with those three assets and the
notes from `docs/releases/<version>.md`.

## Licence

ICOR for Life Source-Available License (Code), Version 1.0. See `LICENSE`.
