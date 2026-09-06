/* Positions are Obsidian's: zero-based line, zero-based character. */
export interface Position {
  line: number;
  ch: number;
}

export interface SelectionRange {
  anchor: Position;
  head: Position;
}

/* Where the content of a bullet line starts, for the cursor rules.
 *   never: the plugin leaves the cursor alone.
 *   bullet-only: content starts after the bullet marker (a checkbox is content).
 *   bullet-and-checkbox: content starts after the checkbox too. */
export type StickMode = 'never' | 'bullet-only' | 'bullet-and-checkbox';

export function samePosition(a: Position, b: Position): boolean {
  return a.line === b.line && a.ch === b.ch;
}

export function comparePositions(a: Position, b: Position): number {
  return a.line === b.line ? a.ch - b.ch : a.line - b.line;
}
