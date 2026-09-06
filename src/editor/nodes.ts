/* Which kind of line is the cursor on, according to the editor's syntax
 * tree rather than to what the text looks like. A `- item` line inside
 * frontmatter, a fenced or indented code block, a table, a callout, a
 * quote, an HTML block or a math block is not a list line however it
 * reads, and every key handler asks this first.
 *
 * Obsidian names a node with its CodeMirror 5 classes joined by
 * underscores: one line node per line (the `line-` classes, prefix
 * stripped) parenting one token node per run. So a name is split into
 * tokens and each token is matched on its own. The rule:
 *
 *   - a name that says code, table, frontmatter, quote, callout, HTML or
 *     math block: `other`, whatever else is on the line (a fence inside an
 *     item carries the list-line class too and is still a fence);
 *   - otherwise the `HyperMD-list-line` line class: `list`. Obsidian puts
 *     it on every bullet line and every continuation line it treats as
 *     part of a list. List tokens without it are not a list line;
 *   - otherwise a heading line class: `heading` (move-to's targets);
 *   - any other non-empty set: `other`. The line was parsed and it is not
 *     a list, whatever the text parser would make of it;
 *   - an empty set: `unknown`. The line was not parsed (yet), and the
 *     decision falls to the text parser.
 *
 * The bare `math` token is not a bail: inline math on a bullet line
 * carries it too. Only the `math-block` token of a `$$` fence is, and
 * the interior of such a block has no line class, so it is `other` by the
 * fourth rule. */
export type NodeContext = 'list' | 'heading' | 'other' | 'unknown';

const BAIL_PREFIXES = ['HyperMD-codeblock', 'hmd-codeblock', 'hmd-indented-code', 'HyperMD-table', 'hmd-table', 'hmd-frontmatter', 'HyperMD-quote', 'quote', 'HyperMD-callout', 'hmd-callout', 'hmd-html', 'math-block'];
const LIST_LINE = 'HyperMD-list-line';
const HEADING_LINE = 'HyperMD-header';
const TOP_NODE = 'Document';

function tokensOf(names: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of names) for (const token of name.split('_')) if (token && token !== TOP_NODE) out.push(token);
  return out;
}

export function classifyNodeNames(names: readonly string[]): NodeContext {
  const tokens = tokensOf(names);
  if (tokens.length === 0) return 'unknown';
  if (tokens.some((t) => BAIL_PREFIXES.some((p) => t.startsWith(p)))) return 'other';
  if (tokens.some((t) => t.startsWith(LIST_LINE))) return 'list';
  if (tokens.some((t) => t.startsWith(HEADING_LINE))) return 'heading';
  return 'other';
}
