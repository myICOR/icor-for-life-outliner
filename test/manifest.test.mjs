/* Identity and floor. One id across the manifest, the package and the
 * constant; one version across three files; a description the directory
 * accepts; every named import from 'obsidian' present at the declared
 * minAppVersion, read from the @since annotations in obsidian.d.ts, the
 * same source the directory's scanner reads; bare command ids and
 * sentence-case names; and no default hotkeys anywhere. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PLUGIN_ID, PLUGIN_NAME } from './build/pure.mjs';

const repo = resolve(import.meta.dirname, '..');
const read = (f) => readFileSync(resolve(repo, f), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const versions = JSON.parse(read('versions.json'));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const cmp = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
};

test('one identity across manifest, package and constants', () => {
  assert.equal(manifest.id, 'icor-for-life-outliner');
  assert.equal(PLUGIN_ID, manifest.id);
  assert.equal(pkg.name, manifest.id);
  assert.equal(manifest.name, 'ICOR for Life - Outliner');
  assert.equal(PLUGIN_NAME, manifest.name);
  assert.equal(manifest.author, 'myICOR');
  assert.equal(manifest.authorUrl, 'https://myicor.com');
  assert.equal(manifest.isDesktopOnly, false, 'an editor extension runs on every platform');
  assert.equal(manifest.minAppVersion, '1.13.0');
  assert.doesNotMatch(manifest.id, /obsidian|plugin$/);
});

test('the description is under 250 characters, ends with a period, and never names the app', () => {
  assert.ok(manifest.description.length < 250, `${manifest.description.length} characters`);
  assert.ok(manifest.description.endsWith('.'));
  assert.doesNotMatch(manifest.description, /obsidian/i);
});

test('one version across manifest, package and versions.json', () => {
  assert.equal(pkg.version, manifest.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
});

test('every named import from obsidian exists at minAppVersion', () => {
  const dts = read('node_modules/obsidian/obsidian.d.ts');
  const since = new Map();
  for (const m of dts.matchAll(/\/\*\*([^]*?)\*\/\s*export (?:abstract )?(?:class|function|interface|type|const|enum|let|var) (\w+)/g)) {
    const s = m[1].match(/@since (\d+\.\d+\.\d+)/);
    if (s && !since.has(m[2])) since.set(m[2], s[1]);
  }
  const floor = manifest.minAppVersion;
  const offenders = [];
  for (const file of walk(resolve(repo, 'src'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/import (?:type )?\{([^}]*)\} from 'obsidian'/g)) {
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0];
        if (!name) continue;
        const s = since.get(name);
        if (s && cmp(s, floor) > 0) offenders.push(`${name} (@since ${s}) in ${file.slice(repo.length + 1)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `newer than minAppVersion ${floor}:\n  ${offenders.join('\n  ')}`);
});

test('commands: bare ids, sentence case, icons, no default hotkeys', () => {
  const src = read('src/commands.ts');
  const ids = [...src.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['fold', 'unfold', 'move-up', 'move-down', 'indent', 'outdent', 'insert-above', 'delete-with-subtree', 'duplicate', 'expand-all', 'collapse-all', 'toggle-done']);
  for (const id of ids) assert.doesNotMatch(id, /icor|outliner|:/, `${id} carries a prefix`);
  const names = [...src.matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
  for (const name of names) {
    assert.match(name, /^[A-Z][a-z]/, `${name} is not sentence case`);
    assert.doesNotMatch(name.slice(1), /\b[A-Z][a-z]+/, `${name} has a capital mid-sentence`);
  }
  assert.equal([...src.matchAll(/icon: '/g)].length, ids.length, 'every command has an icon');
  for (const file of walk(resolve(repo, 'src'))) assert.doesNotMatch(readFileSync(file, 'utf8'), /hotkeys:/, `${file} sets a default hotkey`);
});

test('the release assets exist and the release notes for this version are written', () => {
  for (const f of ['manifest.json', 'styles.css', 'README.md', 'SECURITY.md', 'THIRD-PARTY-NOTICES.md', 'LICENSE', `docs/releases/${manifest.version}.md`, '.github/workflows/release.yml']) {
    assert.ok(statSync(resolve(repo, f)).isFile(), `${f} is missing`);
  }
});
