# Changelog

All notable changes to ICOR for Life - Outliner.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-09-21

### Changed
- Relicensed under MIT. Releases before 0.2.0 remain under the ICOR for Life
  Source-Available License (Code) v1.0.
- Release workflow: actions pinned to commit SHAs, the release published with `gh`, and a release run can never mint its own tag.
- README rewritten for the person installing the plugin, not the person rebuilding it.
- Security contact is support@myicor.com.

## [0.1.0] - 2026-09-06

### Added
- First release: the core outline engine and thirteen commands (fold,
  unfold, expand all, collapse all, move up, move down, indent, outdent,
  insert above, delete with subtree, duplicate, toggle done, move to).
- Tab and Shift-Tab move the whole item, with everything under it, using
  the list's own indentation unit read from its neighbours.
- Enter knows about children: it opens a first child, splits mid-line
  with children following, and outdents on an empty nested item instead
  of doubling it. Steps aside inside frontmatter, code blocks, tables,
  callouts, quotes, HTML blocks and math blocks.
- Backspace and Delete never eat a bullet; they merge two items only
  when that cannot lose structure.
- The cursor stays in the content and out of folded blocks on every
  move.
- Select-all climbs: item, then item with children, then list, then
  note.
- Shift-Up and Shift-Down select whole items with their subtree and
  grow or shrink the selection sibling by sibling; every whole-item
  command works on the selection as one change and one undo step.
- Mod-Shift-Enter inserts an empty item above the current one.
- Two keyboard schemes, Tana and Heptabase, switchable under Settings,
  "Keyboard scheme" (Tana by default, "Obsidian hotkeys only" turns
  both off). Commands carry no default hotkey; a hotkey set under
  Settings, Hotkeys always runs first.
- Drag and drop on desktop, including pop-out windows, one edit and one
  undo step per drag.
- Folds can live in the file: an opt-in `%% fold %%` marker at the end
  of a line keeps a folded item folded across devices.
- Ordered lists renumber after every structural change.

### Known limits
- Built and gated without a running Obsidian; the parts only a live
  vault can settle (fold-marker filter, drag hit-test, Shift-Up/Down
  precedence, fold restore on open, table-cell pairing, the move-to
  picker's performance on very long notes, a drag in a pop-out window,
  Control+Cmd+ArrowUp/ArrowDown against a changed Mission Control
  binding) are the first beta round's check. See `docs/releases/0.1.0.md`.
- Guide lines, drag between two lists, Vim bullets and a zoom hook are
  not in this release; each has a place reserved in the code.

[0.1.0]: docs/releases/0.1.0.md
