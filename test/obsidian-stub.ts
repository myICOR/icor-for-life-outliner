/* The slice of `obsidian` the editor-layer tests need, and nothing more.
 * The real package ships types only, so a test that imports a module with
 * an `obsidian` import gets this in its place (test/lib/build-cm.mjs
 * aliases it). `editorInfoField` is a real StateField so a test can seed
 * the Editor a view believes it belongs to. */
import { StateField } from '@codemirror/state';

export interface StubEditor {
  lineCount(): number;
  lastLine(): number;
  getLine(line: number): string;
}

export interface StubFileInfo {
  editor?: StubEditor;
}

export const editorInfoField = StateField.define<StubFileInfo>({
  create: () => ({}),
  update: (value) => value,
});

export const Platform = { isDesktop: true, isMobile: false };

export class Notice {
  constructor(public readonly message: string) {}
}
