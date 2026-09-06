/* Joining two neighbouring items is allowed only when it cannot lose
 * structure: both are empty, the earlier one is empty at the same level, or
 * the later one is empty and the earlier one is its parent. Content is
 * never folded into content and a subtree is never deleted; in every other
 * case the key is swallowed and nothing happens. The children of the item
 * that disappears become children of the one that stays. */
import type { ListItem, ListTree, Loc } from '../model';
import { childStep, relativeIndent, setIndent } from './indentation';

/* `earlier` must be the item right before `later` in document order. */
export function canMerge(earlier: ListItem, later: ListItem): boolean {
  const bothEmpty = earlier.isEmpty() && later.isEmpty();
  const earlierEmptyAtSameLevel = earlier.isEmpty() && earlier.level === later.level;
  const laterEmptyUnderEarlier = later.isEmpty() && later.parent === earlier;
  return bothEmpty || earlierEmptyAtSameLevel || laterEmptyUnderEarlier;
}

/* Fold `later` into the end of `earlier` and return where the join is. */
export function mergeInto(tree: ListTree, earlier: ListItem, later: ListItem): Loc {
  const lastIndex = earlier.lines.length - 1;
  const incoming = later.lines[0] ?? '';
  earlier.lines[lastIndex] = (earlier.lines[lastIndex] ?? '') + incoming;
  /* `-` plus content would read `-b`, which is no bullet line at all. */
  if (lastIndex === 0 && earlier.bulletGap === '' && (earlier.lines[0] ?? '') !== '') earlier.bulletGap = ' ';
  const joinCh = earlier.lineText(lastIndex).length - incoming.length;
  for (let i = 1; i < later.lines.length; i++) earlier.lines.push(later.lines[i] ?? '');
  tree.detach(later);
  const step = childStep(earlier) ?? (later.children[0] ? relativeIndent(later.children[0]) : '');
  while (later.children.length > 0) {
    const child = later.children[0] as ListItem;
    tree.detach(child);
    tree.attach(child, earlier, earlier.children.length);
    setIndent(child, earlier.indent + step);
  }
  return { item: earlier, lineIndex: lastIndex, ch: joinCh };
}
