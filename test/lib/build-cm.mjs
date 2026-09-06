/* Bundles test/cm-entry.ts for node:test with `obsidian` replaced by the
 * stub. The three CodeMirror packages stay external so the test and the
 * bundle share one copy of every facet and field. */
import esbuild from 'esbuild';
import { resolve } from 'node:path';

export async function buildCm({ cwd = process.cwd() } = {}) {
  const outfile = resolve(cwd, 'test/build/cm.mjs');
  await esbuild.build({
    entryPoints: [resolve(cwd, 'test/cm-entry.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    outfile,
    logLevel: 'warning',
    external: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
    alias: { obsidian: resolve(cwd, 'test/obsidian-stub.ts') },
  });
  return outfile;
}
