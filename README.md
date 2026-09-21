# ICOR for Life - Outliner

**Move a thought without retyping it.**

In plain Obsidian, indenting a bullet leaves its children behind. So you stop
restructuring, and an outline you cannot restructure is an outline you stop
improving. This makes a bullet move with everything under it.

Part of the [ICOR for Life](https://myicor.com) suite.

## What it is for

Thinking is rearranging. You write six bullets, then realise the fourth is
really a child of the second, and the last two belong at the top.

If that costs you a cut, a paste and a re-indent, you will not do it, and the
outline stays in the order you happened to think of things. If it costs one
keystroke, you will do it constantly, and the outline ends up in the order
that is actually true.

Use it for course outlines, video scripts, meeting agendas, project plans:
anything where the shape matters as much as the words.

## Getting started

Enable it and start typing a list. Tab and Shift-Tab now take children with
them. That is most of the value, and there is nothing to configure.

When you want more, open the settings and pick a **keyboard scheme**: Tana or
Heptabase, depending on which you already have in your fingers. If you prefer
Obsidian's own hotkeys, pick none and bind what you like.

## What changes

- **Tab and Shift-Tab** move the whole item, children included.
- **Enter** knows whether an item has children, so a new bullet lands where
  you meant it.
- **Backspace, Delete and the arrows** keep the cursor in the content rather
  than stranding it before the bullet.
- **Shift-Up and Shift-Down** select whole items instead of half a line.
- **Select all** climbs: first the item, then the list, then the note.
- **Fold, move, delete, duplicate and mark** an item from the keyboard.
- **Drag a bullet** on desktop and its children come along.

Thirteen commands carry the same behaviour into the command palette and the
mobile toolbar, so you can bind any of them yourself.

**It changes how keys behave, not how lists look.** Bullets, indent guides and
fold markers stay your theme's.

## Settings

The keyboard scheme. Whether the cursor is kept in the content. Whether Tab
moves the whole item, whether Enter knows about children, whether select-all
climbs, whether Shift-Up and Shift-Down take whole items, and whether dragging
is on. Each can be switched off on its own if it fights a habit you already
have.

One option writes a small marker into your file so that folded sections
survive a reinstall or a move to another machine. It is off by default,
because it is the only setting that changes your file at all.

The settings page also prints what the active scheme binds, so you can see
every chord without hunting, and override any of them under Settings, Hotkeys.

## What it touches

- **The note you are typing in**, through the editor's own API, one edit per
  key press, so undo stays one step per key.
- **Nothing else in your vault.** The one exception is the fold marker above,
  and only when you switch it on.

**It makes no network connection, reads no file and starts no process.**
`SECURITY.md` names the exact file behind every claim.

## Good to know

- **Desktop and mobile.** Dragging is desktop only and the setting hides
  itself on mobile.
- **Whitespace is left exactly as you wrote it.** The plugin never reformats a
  list you did not touch.
- **If you run another outliner plugin**, switch one of them off. Two plugins
  answering the same key press will disagree.
- **A few chords belong to Obsidian first** and cannot be taken; the settings
  page names them.
- **Beta.** If something looks off, open an issue.

## Support

What myICOR supports: the plugin as published in a tagged release, on the
current version, installed from that release. Bugs go to this repo's issues,
security reports to the process in `SECURITY.md`.

What the community maintains: anything marked community-maintained, including
community source adapters. We review it before it is merged. We do not support
it, we cannot promise it keeps working, and it can be disabled or removed in
any release.

What is yours: your own changes, your fork, your local patch. Please reproduce
the problem on a clean install of the current release before reporting it.

## Licence

MIT, see `LICENSE`. Install it, run it, read it, change it, sell it, ship it in
your own product; keep the copyright and licence notice.
Releases before 0.2.0 stay under the ICOR for Life
Source-Available License (Code) v1.0 they were published with.

The licence covers the code only. "ICOR", "ICOR for Life", "myICOR" and
"Paperless Movement" are trademarks of Paperless Movement, S.L.; a fork needs
its own plugin id and name. See `TRADEMARK.md`.

Contributions are welcome as pull requests under the same MIT terms, with a
DCO sign-off on every commit. See `CONTRIBUTING.md`.

Bundled third-party components keep their own licences; see
`THIRD-PARTY-NOTICES.md`.
