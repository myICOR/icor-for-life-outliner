/* Which kind of line is the cursor on, according to the editor's syntax
 * tree rather than to what the text looks like. A `- item` line inside
 * frontmatter, a fenced code block, a table or a callout is not a list line
 * however it reads, and every key handler asks this first.
 *
 * Obsidian names a token with its CSS classes joined by underscores, so a
 * name is split into tokens and each token is matched on its own. */
export type NodeContext = 'list' | 'other' | 'unknown';

const BAIL_PREFIXES = ['HyperMD-codeblock', 'hmd-codeblock', 'HyperMD-table', 'hmd-table', 'hmd-frontmatter', 'HyperMD-quote', 'quote', 'callout', 'hmd-html', 'HyperMD-html'];
const LIST_PREFIXES = ['HyperMD-list-line', 'list-', 'formatting-list'];

function tokensOf(names: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of names) for (const token of name.split('_')) if (token) out.push(token);
  return out;
}

export function classifyNodeNames(names: readonly string[]): NodeContext {
  const tokens = tokensOf(names);
  if (tokens.some((t) => BAIL_PREFIXES.some((p) => t.startsWith(p)))) return 'other';
  if (tokens.some((t) => LIST_PREFIXES.some((p) => t.startsWith(p)))) return 'list';
  return 'unknown';
}
