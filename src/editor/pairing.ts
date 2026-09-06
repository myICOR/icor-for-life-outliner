/* Is this Editor the one whose document a view holds? Inside a Live
 * Preview table cell the plugin runs in a second view built with the
 * parent note's owner, so `editorInfoField.editor` there is the parent's
 * Editor while the view is the cell's. Acting on that pair edits the
 * parent from inside the cell. The check is API-only: the line count and
 * the first line must agree. A cell is one line of a note that holds a
 * table, so the counts differ; the first-line text is the belt to that
 * brace. */
export interface PairedDoc {
  readonly lines: number;
  line(n: number): { readonly text: string };
}

export interface PairedEditor {
  lineCount(): number;
  getLine(line: number): string;
}

export function paired(editor: PairedEditor, doc: PairedDoc): boolean {
  return doc.lines === editor.lineCount() && doc.line(1).text === editor.getLine(0);
}
