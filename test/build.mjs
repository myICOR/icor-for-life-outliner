/* One bundle feeds the gate: the pure surface (model, operations, apply,
 * actions, settings model, the syntax-node classifier) plus the fake editor
 * the fixture runner drives. Nothing in it imports `obsidian` or CodeMirror
 * at runtime, so node:test runs it without a host. */
import { buildPure } from './lib/build-pure.mjs';

await buildPure();
