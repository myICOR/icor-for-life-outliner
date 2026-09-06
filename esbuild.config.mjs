/* Build ICOR for Life - Outliner into a single CommonJS main.js for Obsidian.
 *
 * The plugin is an editor extension. Everything it needs at runtime comes
 * from the host: `obsidian` and the three CodeMirror packages Obsidian
 * exposes to plugins (`@codemirror/state`, `@codemirror/view`,
 * `@codemirror/language`) are external, so main.js carries only this
 * plugin's own code. styles.css is hand-written and tiny: the theme owns
 * how a list looks. */
import esbuild from 'esbuild';
import process from 'node:process';

const production = process.argv[2] === 'production';

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  logLevel: 'info',
  treeShaking: true,
  sourcemap: production ? false : 'inline',
  minify: production,
  external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language'],
});

if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
