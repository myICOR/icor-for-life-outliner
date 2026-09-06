/* Drag and drop, desktop, mouse only. Press on a bullet, move, release:
 * the item with its subtree lands before or after another item of the
 * same list, or inside a childless item as its first child. Everything
 * geometric goes through the view (posAtCoords, coordsAtPos, lineBlockAt)
 * and the parser; no class name is scraped. The drop line is one element
 * positioned through CSS custom properties. Listeners for the move, the
 * release and Escape sit on the document of the window the editor lives
 * in, registered once per document through the plugin, so a pop-out
 * window works like the main one. The drop itself is one runDrop: one
 * detach, one attach, one replaceRange, one undo step. If the document
 * changed under the drag, nothing moves and a notice says so. */
import { StateEffect, StateField } from '@codemirror/state';
import type { Text } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { Notice, Platform, editorInfoField } from 'obsidian';
import { runDrop } from '../actions';
import { parseBulletLine, parseList } from '../model';
import type { ListItem, ListTree } from '../model';
import type { DropPlace } from '../operations';
import { CmEditorAdapter } from './adapter';
import type { EditorHost } from './host';
import { classifyNodeNames } from './nodes';
import { nodeNamesOnLine } from './syntax';

const DRAG_THRESHOLD_PX = 4;
const BULLET_SLACK_PX = 4;
const CHANGED_DURING_DRAG = 'The note changed during the drag; nothing was moved.';

/* ------------------------------------------------- the dragged lines */

const setDragLines = StateEffect.define<{ from: number; to: number } | null>();
const dragLine = Decoration.line({ class: 'icor-outliner-drag-source' });

const dragLinesField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (!effect.is(setDragLines)) continue;
      if (!effect.value) {
        next = Decoration.none;
        continue;
      }
      const ranges = [];
      const doc = tr.state.doc;
      for (let n = doc.lineAt(effect.value.from).number; n <= doc.lineAt(effect.value.to).number; n++) ranges.push(dragLine.range(doc.line(n).from));
      next = Decoration.set(ranges);
    }
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/* ------------------------------------------------------- drag state */

interface DropTarget {
  line: number;
  place: DropPlace;
}

interface Drag {
  view: EditorView;
  doc: Text;
  tree: ListTree;
  item: ListItem;
  sourceLine: number;
  contentFrom: number;
  startX: number;
  startY: number;
  started: boolean;
  indicator: HTMLElement | null;
  target: DropTarget | null;
}

let current: Drag | null = null;
const wired = new WeakSet<Document>();

function cursorAt(line: number): { anchor: { line: number; ch: number }; head: { line: number; ch: number } } {
  const at = { line, ch: 0 };
  return { anchor: at, head: at };
}

function adapterFor(host: EditorHost, view: EditorView): CmEditorAdapter | null {
  const editor = view.state.field(editorInfoField, false)?.editor;
  return editor ? new CmEditorAdapter(editor, view, () => host.foldUnavailable()) : null;
}

/* Is the pointer on the bullet of a list item? Returns what a drag needs. */
function bulletUnder(host: EditorHost, view: EditorView, x: number, y: number): Omit<Drag, 'startX' | 'startY' | 'started' | 'indicator' | 'target'> | null {
  const pos = view.posAtCoords({ x, y });
  if (pos === null) return null;
  const line = view.state.doc.lineAt(pos);
  const bullet = parseBulletLine(line.text);
  if (!bullet) return null;
  const n = line.number - 1;
  if (classifyNodeNames(nodeNamesOnLine(view.state, n)) === 'other') return null;
  const bulletFrom = line.from + bullet.indent.length;
  const contentFrom = bulletFrom + bullet.bullet.length + bullet.bulletGap.length;
  const left = view.coordsAtPos(bulletFrom, 1)?.left;
  const right = view.coordsAtPos(contentFrom, -1)?.left ?? view.coordsAtPos(contentFrom)?.left;
  if (left === undefined || right === undefined) return null;
  if (x < left - BULLET_SLACK_PX || x > right + BULLET_SLACK_PX) return null;
  const adapter = adapterFor(host, view);
  if (!adapter) return null;
  const parsed = parseList(adapter, n, { foldedLines: adapter.foldedLines(), indentUnit: adapter.indentUnit(), selection: cursorAt(n) });
  if (!parsed.ok) return null;
  const found = parsed.tree.locateLine(n);
  if (!found || found.lineIndex !== 0) return null;
  return { view, doc: view.state.doc, tree: parsed.tree, item: found.item, sourceLine: n, contentFrom };
}

/* ---------------------------------------------------------- geometry */

interface Box {
  top: number;
  bottom: number;
}

/* Screen coordinates of the visible block an item's own lines occupy; a
   folded item's block reaches over what it hides. */
function itemBox(view: EditorView, tree: ListTree, item: ListItem): Box {
  const first = tree.lineOf(item);
  const last = item.folded ? first : first + item.lines.length - 1;
  const top = view.lineBlockAt(view.state.doc.line(first + 1).from);
  const bottom = view.lineBlockAt(view.state.doc.line(last + 1).from);
  return { top: view.documentTop + top.top, bottom: view.documentTop + bottom.bottom };
}

function targetUnder(d: Drag, x: number, y: number): DropTarget | null {
  const { view, tree } = d;
  const pos = view.posAtCoords({ x, y }, false);
  const n = view.state.doc.lineAt(pos).number - 1;
  if (n < tree.startLine || n > tree.endLine) return null;
  const found = tree.locateLine(n);
  if (!found) return null;
  let item = found.item;
  if (tree.isHidden(item)) item = tree.outermostFoldedAncestor(item) ?? item;
  for (let p: ListItem | null = item; p; p = p.parent) if (p === d.item) return null;
  const box = itemBox(view, tree, item);
  const line = tree.lineOf(item);
  if (y < (box.top + box.bottom) / 2) return { line, place: 'before' };
  if (item.hasChildren()) return { line, place: item.folded ? 'after' : 'child' };
  const contentLeft = view.coordsAtPos(view.state.doc.line(line + 1).from + item.prefix().length)?.left;
  return { line, place: contentLeft !== undefined && x >= contentLeft ? 'child' : 'after' };
}

function placeIndicator(d: Drag, target: DropTarget | null): void {
  const el = d.indicator;
  if (!el) return;
  if (!target) {
    el.hide();
    return;
  }
  const { view, tree } = d;
  const item = tree.locateLine(target.line)?.item;
  if (!item) return;
  const box = itemBox(view, tree, item);
  const lineFrom = view.state.doc.line(target.line + 1).from;
  const anchorPos = lineFrom + (target.place === 'child' ? item.prefix().length : item.indent.length);
  const left = view.coordsAtPos(anchorPos)?.left ?? view.contentDOM.getBoundingClientRect().left;
  const right = view.contentDOM.getBoundingClientRect().right;
  const frame = view.dom.getBoundingClientRect();
  const y = target.place === 'before' ? box.top : box.bottom;
  el.setCssProps({
    '--icor-outliner-drop-top': `${y - frame.top}px`,
    '--icor-outliner-drop-left': `${left - frame.left}px`,
    '--icor-outliner-drop-width': `${Math.max(0, right - left)}px`,
  });
  el.show();
}

/* ---------------------------------------------------------- lifecycle */

function begin(d: Drag): void {
  d.started = true;
  d.view.dom.addClass('icor-outliner-dragging');
  d.indicator = d.view.dom.createDiv({ cls: 'icor-outliner-drop-line' });
  d.indicator.hide();
  const from = d.view.state.doc.line(d.sourceLine + 1).from;
  const to = d.view.state.doc.line(d.sourceLine + d.item.subtreeLineCount()).to;
  d.view.dispatch({ effects: setDragLines.of({ from, to }) });
}

function finish(d: Drag): void {
  d.view.dom.removeClass('icor-outliner-dragging');
  d.indicator?.remove();
  d.indicator = null;
  if (d.started) d.view.dispatch({ effects: setDragLines.of(null) });
}

function onMove(host: EditorHost, event: MouseEvent): void {
  const d = current;
  if (!d) return;
  if (!d.started) {
    if (Math.abs(event.clientX - d.startX) < DRAG_THRESHOLD_PX && Math.abs(event.clientY - d.startY) < DRAG_THRESHOLD_PX) return;
    begin(d);
  }
  event.preventDefault();
  d.target = targetUnder(d, event.clientX, event.clientY);
  placeIndicator(d, d.target);
  void host;
}

function onUp(host: EditorHost, event: MouseEvent): void {
  const d = current;
  if (!d) return;
  current = null;
  finish(d);
  if (!d.started) {
    /* A click on the bullet: the caret goes into the item. */
    d.view.dispatch({ selection: { anchor: d.contentFrom } });
    d.view.focus();
    return;
  }
  event.preventDefault();
  if (!d.view.state.doc.eq(d.doc)) {
    new Notice(CHANGED_DURING_DRAG);
    host.log('drop: the note changed during the drag');
    return;
  }
  if (!d.target) {
    host.log('drop: no target');
    return;
  }
  const adapter = adapterFor(host, d.view);
  if (!adapter) return;
  const outcome = runDrop(adapter, host.settings, { sourceLine: d.sourceLine, targetLine: d.target.line, place: d.target.place });
  host.log(`drop ${d.target.place} line ${d.target.line}: ${outcome.reason}`);
}

function onKey(host: EditorHost, event: KeyboardEvent): void {
  const d = current;
  if (!d || event.key !== 'Escape') return;
  current = null;
  finish(d);
  event.preventDefault();
  host.log('drop: cancelled');
}

/* One set of listeners per window document, for the life of the plugin. */
function wire(host: EditorHost, doc: Document): void {
  if (wired.has(doc)) return;
  wired.add(doc);
  host.registerDomEvent(doc, 'mousemove', (event) => onMove(host, event));
  host.registerDomEvent(doc, 'mouseup', (event) => onUp(host, event));
  host.registerDomEvent(doc, 'keydown', (event) => onKey(host, event), { capture: true });
}

export function dragDrop(host: EditorHost) {
  const plugin = ViewPlugin.define(
    (view) => {
      wire(host, view.dom.doc);
      return {
        destroy() {
          if (current?.view === view) {
            finish(current);
            current = null;
          }
        },
      };
    },
    {
      eventHandlers: {
        mousedown(event, view) {
          if (!Platform.isDesktop || !host.settings.dragDrop || current) return false;
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
          const hit = bulletUnder(host, view, event.clientX, event.clientY);
          if (!hit) return false;
          current = { ...hit, startX: event.clientX, startY: event.clientY, started: false, indicator: null, target: null };
          return true;
        },
      },
    },
  );
  return [dragLinesField, plugin];
}
