/* Two bundles feed the gate: the pure surface (model, operations, apply,
 * actions, settings model, the syntax-node classifier, the pairing check)
 * plus the fake editor the fixture runner drives, which imports neither
 * `obsidian` nor CodeMirror; and the editor-layer filters over a real
 * @codemirror/state with `obsidian` stubbed. */
import { buildPure } from './lib/build-pure.mjs';
import { buildCm } from './lib/build-cm.mjs';

await buildPure();
await buildCm();
