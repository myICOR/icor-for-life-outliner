/* The pure surface under test, bundled once so node:test can import it
 * without an Obsidian runtime. Only modules with no Obsidian or CodeMirror
 * import belong here. */
export * from '../src/model';
export * from '../src/operations';
export * from '../src/apply';
export * from '../src/actions';
export * from '../src/moveTo';
export * from '../src/editor/nodes';
export * from '../src/editor/pairing';
export * from '../src/settings/model';
export * from '../src/settings/definitions';
export * from '../src/commandTable';
export * from '../src/constants';
export { FakeEditor } from './fake';
