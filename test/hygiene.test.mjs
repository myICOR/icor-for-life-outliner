/* Text properties of the repo: what the directory's scanner reads, what the
 * team's hard rules say, and what the clean room requires. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const read = (f) => readFileSync(resolve(repo, f), 'utf8');

function walk(dir, exts) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'build' || name === 'node_modules') continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => p.endsWith(e))) out.push(p);
  }
  return out;
}

/* Every text file in the repo except this one, which carries the very
   strings it forbids. */
const self = resolve(repo, 'test/hygiene.test.mjs');
const textFiles = ['README.md', 'SECURITY.md', 'THIRD-PARTY-NOTICES.md', 'manifest.json', 'package.json', 'styles.css', 'esbuild.config.mjs', 'eslint.config.mjs']
  .map((f) => resolve(repo, f))
  .concat(walk(resolve(repo, 'src'), ['.ts']), walk(resolve(repo, 'test'), ['.mjs', '.ts', '.txt']), walk(resolve(repo, 'docs'), ['.md']), walk(resolve(repo, '.github'), ['.yml']))
  .filter((f) => f !== self);

const sources = walk(resolve(repo, 'src'), ['.ts']);

test('no em dash or en dash anywhere in the repo text', () => {
  const hits = [];
  for (const f of textFiles) {
    for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
      if (/[\u2014\u2013]/.test(line)) hits.push(`${f.slice(repo.length + 1)}:${i + 1}`);
    }
  }
  assert.deepEqual(hits, [], `dashes at:\n  ${hits.join('\n  ')}`);
});

test('the clean room: no upstream names, no foreign class prefix, no attribution', () => {
  const forbidden = [/vslinko/i, /slinko/i, /obsidian-outliner/i, /outliner-plugin-/, /inspired by/i, /based on/i, /original author/i];
  for (const f of textFiles) {
    const text = readFileSync(f, 'utf8');
    for (const re of forbidden) assert.doesNotMatch(text, re, `${f.slice(repo.length + 1)} matches ${re}`);
  }
});

test('the plugin touches no private surface and no global it should not', () => {
  const banned = [
    [/\.cm\b/, 'the private editor.cm field'],
    [/vault\.config/, 'app.vault.config'],
    [/app\.plugins\b/, 'app.plugins'],
    [/internalPlugins/, 'app.internalPlugins'],
    [/CodeMirrorAdapter/, 'the Vim adapter global'],
    [/ObsidianZoomPlugin/, 'the zoom plugin global'],
    [/window\.event/, 'window.event'],
    [/\bprocess\./, 'Node process'],
    [/\bdocument\./, 'the global document (use activeDocument)'],
    [/\bsetTimeout\(|\bsetInterval\(/, 'a bare timer'],
    [/console\.(log|info|warn|error)\(/, 'console output outside the debug channel'],
    [/\beval\(|new Function\(/, 'dynamic code'],
    [/\.style\.[a-zA-Z]+\s*=/, 'an inline style write'],
    [/innerHTML|outerHTML/, 'raw HTML'],
    [/\bfetch\(|XMLHttpRequest|WebSocket|requestUrl/, 'a network call'],
    [/from ['"](node:)?(fs|child_process|path|os)['"]/, 'a Node module'],
    [/\(\?<[=!]/, 'a regex lookbehind'],
    [/!important/, '!important'],
  ];
  for (const f of sources) {
    const text = readFileSync(f, 'utf8');
    for (const [re, what] of banned) assert.doesNotMatch(text, re, `${f.slice(repo.length + 1)} uses ${what}`);
  }
});

test('every class the plugin adds carries the icor-outliner- prefix', () => {
  for (const f of sources) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(?:addClass|cls:)\s*\(?\s*'([^']+)'/g)) {
      assert.match(m[1], /^icor-outliner-/, `${f.slice(repo.length + 1)}: class ${m[1]}`);
    }
  }
});

test('the stylesheet: prefixed selectors, Obsidian variables only, no hex, no pixel, no !important', () => {
  const css = read('styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, 'a hex colour');
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /\d(px|em|rem)\b/, 'a literal length; sizes come from --size-* and --radius-*');
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    for (const selector of m[1].split(',')) assert.match(selector.trim(), /^\.icor-outliner-/, `selector ${selector.trim()} is not on the prefix`);
  }
  for (const m of css.matchAll(/(color|background[a-z-]*|z-index|font-weight|height|width|border-radius)\s*:\s*([^;]+);/g)) {
    assert.match(m[2].trim(), /^var\(--|^calc\(|^\d+$/, `${m[1]}: ${m[2].trim()} is not an Obsidian variable`);
  }
});

test('drag and drop listens through the plugin, never through addEventListener, and never on a global document', () => {
  const src = read('src/editor/dragDrop.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(src, /addEventListener/);
  assert.doesNotMatch(src, /\bdocument\b/, 'the global document');
  assert.match(src, /registerDomEvent\(doc, 'mousemove'/);
  assert.match(src, /registerDomEvent\(doc, 'mouseup'/);
  assert.match(src, /registerDomEvent\(doc, 'keydown'/);
  assert.match(src, /setCssProps\(/);
  assert.doesNotMatch(src, /\.style\./);
});

test('the Editor is reached through the pairing door only', () => {
  /* `editorInfoField` hands out the parent note's Editor inside a table
     cell; `ownEditor` in registry.ts is the one place that reads it and
     checks the pairing, and every other module goes through that. */
  for (const f of sources) {
    if (f.endsWith('/registry.ts')) continue;
    const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(text, /editorInfoField/, `${f.slice(repo.length + 1)} reads editorInfoField directly`);
  }
});

test('the built plugin bundles nothing but its own code', () => {
  const main = read('main.js');
  assert.match(main, /require\("obsidian"\)/);
  assert.match(main, /require\("@codemirror\/language"\)/);
  assert.match(main, /require\("@codemirror\/state"\)/);
  assert.match(main, /require\("@codemirror\/view"\)/);
  assert.doesNotMatch(main, /node_modules/, 'a dependency was bundled');
  assert.ok(main.length < 64000, `main.js is ${main.length} bytes; expected a small plugin`);
});

test('Prec.high is used for Tab, Shift-Tab and the Enter family only, and Prec.highest nowhere', () => {
  /* Prec.high sits above core's list keymap (default precedence, registered
     after plugin extensions) and below the Live Preview image editor's
     Enter and Tab (Prec.high, registered earlier). Prec.highest would
     shadow the image editor. */
  const src = read('src/editor/keymap.ts');
  assert.doesNotMatch(src, /Prec\.highest/);
  const high = src.slice(src.indexOf('Prec.high('), src.indexOf('),\n    keymap.of(['));
  const keys = [...high.matchAll(/key: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['Tab', 'Shift-Tab', 'Enter', 'Mod-Shift-Enter']);
  assert.equal((src.match(/Prec\.high\(/g) ?? []).length, 1);
});
