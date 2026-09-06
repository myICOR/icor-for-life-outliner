/* Is this Editor the one whose document a view holds? Inside a Live
 * Preview table cell the plugin runs in a second view built with the
 * parent note's owner, so `editorInfoField.editor` there is the parent's
 * Editor while the view is the cell's. Acting on that pair edits the
 * parent from inside the cell. The check is API-only: the line count,
 * the first line and the last line must agree. A cell is usually one
 * line of a note that holds a table, so the counts differ; a cell can be
 * multi-line (`<br>` becomes a newline in the cell editor), so the first
 * and last lines are the belt to that brace.
 *
 * The residual, stated plainly: a note whose line count, first line and
 * last line all equal a cell's is read as paired. That takes a note built
 * for the purpose (`x`, then `| x<br>y<br>z |`, then `|---|`, with `z`
 * as the note's last line too); no user writes it by accident, and the
 * consequence is bounded to commands run from a MarkdownFileInfo context
 * on that note. A view carries no public field that names its own
 * Editor, so this is as far as the documented API reaches. */
export interface PairedDoc {
  readonly lines: number;
  line(n: number): { readonly text: string };
}

export interface PairedEditor {
  lineCount(): number;
  lastLine(): number;
  getLine(line: number): string;
}

export function paired(editor: PairedEditor, doc: PairedDoc): boolean {
  return doc.lines === editor.lineCount() && doc.line(1).text === editor.getLine(0) && doc.line(doc.lines).text === editor.getLine(editor.lastLine());
}
