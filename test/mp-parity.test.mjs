import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import * as esmSchema from '../src/schema.mjs';
import * as esmImport from '../src/import-weread.mjs';
import * as esmReview from '../src/review.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, '..', 'fixtures');
const LIB = join(HERE, '..', 'mp', 'lib');
const require = createRequire(import.meta.url);

const NOW = 1757000000;

function haveBuild() {
  return ['schema.js', 'import-weread.js', 'review.js'].every((f) => existsSync(join(LIB, f)));
}

function loadFixture() {
  return readdirSync(FIX)
    .filter((f) => f.startsWith('weread_') && f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(FIX, f), 'utf8')));
}

// The mini program cannot use web-view (个人类型的小程序暂不支持使用), so it is a real second
// client rather than a wrapper. Two clients means two chances to drift apart. src/ is the only
// source of truth and mp/lib/ is generated from it; these tests fail the moment that stops
// being true, rather than letting the same bug get fixed on one side only.
test('mp/lib is built — run node tools/build-mp.mjs', () => {
  assert.ok(haveBuild(), 'mp/lib missing; the mini program would ship stale logic');
});

test('the converted modules export exactly what the source does', () => {
  const pairs = [
    [esmSchema, require(join(LIB, 'schema.js'))],
    [esmImport, require(join(LIB, 'import-weread.js'))],
    [esmReview, require(join(LIB, 'review.js'))],
  ];
  for (const [esm, cjs] of pairs) {
    const a = Object.keys(esm).filter((k) => k !== 'default').sort();
    const b = Object.keys(cjs).sort();
    assert.deepEqual(b, a);
  }
});

test('both builds import the real fixture to byte-identical cards', () => {
  const cjs = require(join(LIB, 'import-weread.js'));
  const blobs = loadFixture();
  const a = esmImport.importWeRead(blobs);
  const b = cjs.importWeRead(blobs);
  assert.equal(b.skipped, a.skipped);
  assert.equal(JSON.stringify(b.cards), JSON.stringify(a.cards));
});

test('both builds schedule a card identically over a long run', () => {
  const cjsReview = require(join(LIB, 'review.js'));
  const cjsImport = require(join(LIB, 'import-weread.js'));
  let a = esmImport.importWeRead(loadFixture()).cards;
  let b = cjsImport.importWeRead(loadFixture()).cards;
  let now = NOW;

  for (let day = 0; day < 30; day++) {
    const batchA = esmReview.pickDaily(a, { now, size: 10, maxNew: 5 });
    const batchB = cjsReview.pickDaily(b, { now, size: 10, maxNew: 5 });
    assert.deepEqual(batchB.map((c) => c.id), batchA.map((c) => c.id), `day ${day}: batches differ`);

    // alternate the answers so both ladders — up and reset — get exercised
    batchA.forEach((c, i) => {
      const out = i % 3 === 0 ? 'again' : 'got';
      const g = esmReview.grade(c, out, now);
      a = a.map((x) => (x.id === g.id ? g : x));
    });
    batchB.forEach((c, i) => {
      const out = i % 3 === 0 ? 'again' : 'got';
      const g = cjsReview.grade(c, out, now);
      b = b.map((x) => (x.id === g.id ? g : x));
    });
    assert.equal(JSON.stringify(b), JSON.stringify(a), `day ${day}: state diverged`);
    now += esmReview.DAY;
  }
  assert.deepEqual(cjsReview.stats(b, now), esmReview.stats(a, now));
});

test('the two-button fix is present in the mini program build too', () => {
  const cjs = require(join(LIB, 'review.js'));
  const card = esmImport.importWeRead(loadFixture()).cards[0];
  const got = cjs.grade(card, 'got', NOW);
  const again = cjs.grade(card, 'again', NOW);
  assert.notEqual(got.review.due, again.review.due);
  assert.equal(got.review.interval, 3);
  assert.equal(again.review.interval, 1);
});

test('merge still protects review state on the mini program side', () => {
  const cjs = require(join(LIB, 'schema.js'));
  const cards = esmImport.importWeRead(loadFixture()).cards;
  const stored = [{ ...cards[0], review: { interval: 7, due: 1, reps: 2, lapses: 0, last: 1 } }];
  const { changed } = cjs.mergeById(stored, [{ ...cards[0], text: '改过了' }]);
  assert.equal(changed.length, 1);
  assert.ok(changed[0].review, '重新导入不能抹掉回顾进度');
});
