/* The list as a tree of items. An item is one bullet line, the "notes" lines
 * indented under it (kept verbatim, whitespace and all), and its children.
 * The tree remembers where it sits in the document (`startLine`) and where
 * the selection is, expressed relative to items so that every operation can
 * move items around and ask for absolute positions afterwards. */
import { leadingWhitespace } from './line';
import type { Position, StickMode } from './types';

export class ListItem {
  parent: ListItem | null = null;
  readonly children: ListItem[] = [];
  folded = false;

  constructor(
    public indent: string,
    public bullet: string,
    public bulletGap: string,
    public checkbox: string | null,
    public checkboxGap: string,
    /* lines[0] is the content of the bullet line after the prefix; the rest
       are notes lines, verbatim. */
    public readonly lines: string[],
  ) {}

  /* One-based nesting depth. */
  get level(): number {
    let n = 1;
    for (let p = this.parent; p; p = p.parent) n++;
    return n;
  }

  prefix(): string {
    return this.indent + this.bullet + this.bulletGap + (this.checkbox ? this.checkbox + this.checkboxGap : '');
  }

  /* Where the cursor may live on the bullet line, per the stick mode. */
  contentStart(mode: StickMode): number {
    const afterBullet = this.indent.length + this.bullet.length + this.bulletGap.length;
    if (mode === 'bullet-and-checkbox' && this.checkbox) return afterBullet + this.checkbox.length + this.checkboxGap.length;
    return afterBullet;
  }

  /* Where the content of line `index` of this item starts. */
  lineContentStart(index: number, mode: StickMode): number {
    if (index === 0) return this.contentStart(mode);
    return leadingWhitespace(this.lines[index] ?? '').length;
  }

  lineText(index: number): string {
    if (index === 0) return this.prefix() + (this.lines[0] ?? '');
    return this.lines[index] ?? '';
  }

  isEmpty(): boolean {
    return this.lines.length === 1 && (this.lines[0] ?? '').trim() === '';
  }

  hasChildren(): boolean {
    return this.children.length > 0;
  }

  /* The last item of this subtree in document order. */
  lastDescendant(): ListItem {
    let item: ListItem = this;
    while (item.children.length > 0) item = item.children[item.children.length - 1] as ListItem;
    return item;
  }

  /* Lines this item and everything under it occupy. */
  subtreeLineCount(): number {
    let n = this.lines.length;
    for (const c of this.children) n += c.subtreeLineCount();
    return n;
  }

  /* Every item under this one, in document order, this one excluded. */
  descendants(): ListItem[] {
    const out: ListItem[] = [];
    const walk = (item: ListItem): void => {
      for (const c of item.children) {
        out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
}

/* A selection end, pinned to an item so it survives moves. */
export interface Loc {
  item: ListItem;
  lineIndex: number;
  ch: number;
}

export interface TreeSelection {
  /* null when the anchor sits outside the list. */
  anchor: Loc | null;
  head: Loc;
}

export class ListTree {
  selection: TreeSelection;

  constructor(
    public readonly startLine: number,
    public readonly items: ListItem[],
    /* The editor's indent unit, the last fallback when the list gives no hint. */
    public readonly indentUnit: string,
    selection: TreeSelection,
  ) {
    this.selection = selection;
  }

  /* ------------------------------------------------------------ structure */

  siblingsOf(item: ListItem): ListItem[] {
    return item.parent ? item.parent.children : this.items;
  }

  indexOf(item: ListItem): number {
    return this.siblingsOf(item).indexOf(item);
  }

  previousSibling(item: ListItem): ListItem | null {
    const s = this.siblingsOf(item);
    return s[s.indexOf(item) - 1] ?? null;
  }

  nextSibling(item: ListItem): ListItem | null {
    const s = this.siblingsOf(item);
    return s[s.indexOf(item) + 1] ?? null;
  }

  itemsInOrder(): ListItem[] {
    const out: ListItem[] = [];
    const walk = (list: ListItem[]): void => {
      for (const item of list) {
        out.push(item);
        walk(item.children);
      }
    };
    walk(this.items);
    return out;
  }

  /* The item before `item` in document order, whatever its level. */
  previousInOrder(item: ListItem): ListItem | null {
    const all = this.itemsInOrder();
    return all[all.indexOf(item) - 1] ?? null;
  }

  nextInOrder(item: ListItem): ListItem | null {
    const all = this.itemsInOrder();
    return all[all.indexOf(item) + 1] ?? null;
  }

  /* Detach an item from its parent and return the index it held. */
  detach(item: ListItem): number {
    const s = this.siblingsOf(item);
    const i = s.indexOf(item);
    if (i >= 0) s.splice(i, 1);
    item.parent = null;
    return i;
  }

  /* Put `item` under `parent` (null for the top level) at `index`. */
  attach(item: ListItem, parent: ListItem | null, index: number): void {
    const s = parent ? parent.children : this.items;
    s.splice(index, 0, item);
    item.parent = parent;
  }

  /* --------------------------------------------------------------- lines */

  get endLine(): number {
    return this.startLine + this.lineCount() - 1;
  }

  lineCount(): number {
    let n = 0;
    for (const item of this.items) n += item.subtreeLineCount();
    return n;
  }

  /* Absolute line of the item's bullet line. */
  lineOf(item: ListItem): number {
    let line = this.startLine;
    for (const it of this.itemsInOrder()) {
      if (it === item) return line;
      line += it.lines.length;
    }
    throw new Error('item is not in this tree');
  }

  /* The item and line index that own an absolute line, or null. */
  locateLine(line: number): { item: ListItem; lineIndex: number } | null {
    let at = this.startLine;
    for (const item of this.itemsInOrder()) {
      if (line >= at && line < at + item.lines.length) return { item, lineIndex: line - at };
      at += item.lines.length;
    }
    return null;
  }

  locate(pos: Position): Loc | null {
    const found = this.locateLine(pos.line);
    return found ? { item: found.item, lineIndex: found.lineIndex, ch: pos.ch } : null;
  }

  absolute(loc: Loc): Position {
    return { line: this.lineOf(loc.item) + loc.lineIndex, ch: loc.ch };
  }

  /* Is `item` inside a folded subtree (hidden), as opposed to being the
     folded item itself (visible)? */
  isHidden(item: ListItem): boolean {
    for (let p = item.parent; p; p = p.parent) if (p.folded) return true;
    return false;
  }

  /* The nearest ancestor that hides `item`, outermost first, or null. */
  outermostFoldedAncestor(item: ListItem): ListItem | null {
    let found: ListItem | null = null;
    for (let p = item.parent; p; p = p.parent) if (p.folded) found = p;
    return found;
  }

  setCursor(item: ListItem, lineIndex: number, ch: number): void {
    const loc = { item, lineIndex, ch };
    this.selection = { anchor: loc, head: loc };
  }

  setSelection(anchor: Loc, head: Loc): void {
    this.selection = { anchor, head };
  }

  hasSingleCursor(): boolean {
    const { anchor, head } = this.selection;
    return anchor !== null && anchor.item === head.item && anchor.lineIndex === head.lineIndex && anchor.ch === head.ch;
  }
}
