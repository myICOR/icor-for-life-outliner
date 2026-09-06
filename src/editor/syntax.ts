/* The syntax-tree names touching one line, from the editor's own parser.
 * The parse is nudged up to the end of the line with a small time budget
 * and falls back to whatever the tree already holds; an unparsed line comes
 * back empty and reads as "unknown", which leaves the decision to the text
 * parser. */
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

const PARSE_BUDGET_MS = 20;

export function nodeNamesOnLine(state: EditorState, line: number): string[] {
  if (line < 0 || line >= state.doc.lines) return [];
  const l = state.doc.line(line + 1);
  const tree = ensureSyntaxTree(state, l.to, PARSE_BUDGET_MS) ?? syntaxTree(state);
  const names = new Set<string>();
  tree.iterate({
    from: l.from,
    to: l.to,
    enter: (node) => {
      if (node.name && node.name !== 'Document') names.add(node.name);
    },
  });
  return [...names];
}
