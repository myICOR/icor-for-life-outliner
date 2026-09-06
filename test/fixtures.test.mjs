/* Every fixture case is one test. The cases are the behaviour spec: each
 * one is a document, a key, and the document afterwards. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as pure from './build/pure.mjs';
import { loadFixtures, runCase } from './lib/fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cases = loadFixtures(resolve(here, 'fixtures'));

test('the fixture corpus is large enough to be a spec', () => {
  assert.ok(cases.length >= 60, `${cases.length} cases`);
  const names = new Set();
  for (const c of cases) {
    assert.ok(!names.has(`${c.file}:${c.name}`), `duplicate case name ${c.file}: ${c.name}`);
    names.add(`${c.file}:${c.name}`);
  }
});

for (const c of cases) {
  test(`${c.file.replace(/\.txt$/, '')}: ${c.name}`, () => {
    const problem = runCase(pure, c);
    assert.equal(problem, null, problem ?? '');
  });
}
