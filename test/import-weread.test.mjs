import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { importWeRead, importWeReadBook, flatten } from '../src/import-weread.mjs';
import { validate, mergeById, isReviewable } from '../src/schema.mjs';

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

function loadFixture() {
  return readdirSync(FIX)
    .filter((f) => f.startsWith('weread_') && f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(FIX, f), 'utf8')));
}

test('fixture is present and is the real harvest, not a stub', () => {
  const blobs = loadFixture();
  assert.equal(blobs.length, 17, '17 book files were harvested on 2026-09-06');
});

test('every entry in the real fixture is accounted for', () => {
  const { cards, skipped } = importWeRead(loadFixture());
  assert.equal(cards.length + skipped, 94, 'all 94 harvested entries are accounted for');
  // the 2 skipped are star-only book ratings (type 4, star set, content ''), verified 2026-09-06
  assert.equal(skipped, 2);
  assert.equal(cards.length, 92);
});

test('every produced card passes schema validation', () => {
  const { cards } = importWeRead(loadFixture());
  const bad = cards.map((c) => [c.id, validate(c)]).filter(([, p]) => p.length);
  assert.deepEqual(bad, [], `invalid cards: ${JSON.stringify(bad.slice(0, 3))}`);
});

test('ids are unique so re-import cannot duplicate', () => {
  const { cards } = importWeRead(loadFixture());
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
});

test('star-only book ratings are excluded: a rating is not something to review', () => {
  // In the real fixture the 2 type-4 entries carry `star`/`newRatingLevel` and an empty
  // `content`, with no abstract. They are ratings, not highlights, so they must not become cards.
  const blobs = loadFixture();
  const rated = [];
  for (const b of blobs) {
    for (const e of b?.reviews?.reviews ?? []) {
      const r = e.review ?? e;
      if (r.type === 4) rated.push(String(r.reviewId));
    }
  }
  assert.equal(rated.length, 2, 'the fixture holds exactly 2 star ratings');
  const { cards } = importWeRead(blobs);
  const ids = new Set(cards.map((c) => c.id));
  for (const rid of rated) assert.ok(!ids.has(`weread:${rid}`), `rating ${rid} must not be a card`);
});

test('a written book review with no highlight IS kept as a note-only card', () => {
  // The real fixture has no such entry, so this covers the branch synthetically and says so.
  const blob = {
    bookId: '1',
    title: '某本书',
    reviews: { reviews: [{ review: { reviewId: 'r9', type: 4, bookId: '1', content: '整本书读完的感想', createTime: 1700000000, book: { title: '某本书', author: '某人' } } }] },
  };
  const { cards, skipped } = importWeReadBook(blob);
  assert.equal(skipped, 0);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].text, '');
  assert.equal(cards[0].note, '整本书读完的感想');
  assert.equal(cards[0].chapter, null);
  assert.ok(isReviewable(cards[0]), 'a note without a highlight is still worth reviewing');
  assert.deepEqual(validate(cards[0]), []);
});

test('createdAt is seconds; imported cards span 2022..2024', () => {
  const { cards } = importWeRead(loadFixture());
  const ts = cards.map((c) => c.createdAt).filter(Boolean);
  assert.ok(Math.min(...ts) > 1_500_000_000, 'not milliseconds, not zero');
  assert.ok(Math.max(...ts) < 2_000_000_000, 'still seconds at the top end');
  // the fixture as a whole reaches back to 2020, but that oldest entry is a star rating,
  // so the oldest *card* is 2022. Locking both numbers in keeps that distinction honest.
  assert.equal(new Date(Math.min(...ts) * 1000).getUTCFullYear(), 2022);
  assert.equal(new Date(Math.max(...ts) * 1000).getUTCFullYear(), 2024);
});

test('the raw fixture itself reaches back to 2020', () => {
  const all = [];
  for (const b of loadFixture()) {
    for (const e of b?.reviews?.reviews ?? []) {
      const r = e.review ?? e;
      if (r.createTime) all.push(r.createTime);
    }
  }
  assert.equal(new Date(Math.min(...all) * 1000).getUTCFullYear(), 2020);
});

test('cards come back newest first', () => {
  const { cards } = importWeRead(loadFixture());
  for (let i = 1; i < cards.length; i++) {
    assert.ok(cards[i - 1].createdAt >= cards[i].createdAt);
  }
});

// Regression: the import screen persisted the freshly parsed cards instead of the merged ones,
// so re-importing silently reset every card's review schedule. Caught in the browser on
// 2026-09-07 when a re-import wiped five answered cards.
test('mergeById reports exactly which records must be written', () => {
  const { cards } = importWeRead(loadFixture());
  const stored = cards.map((c, i) => (i < 5 ? { ...c, review: { interval: 7, due: 1, reps: 2, lapses: 0, last: 1 } } : c));

  const same = mergeById(stored, cards);
  assert.deepEqual(same.changed, [], '内容没变就不该写库');

  const edited = [{ ...cards[0], text: '改过的句子' }];
  const one = mergeById(stored, edited);
  assert.equal(one.changed.length, 1);
  assert.equal(one.changed[0].text, '改过的句子');
  assert.deepEqual(one.changed[0].review, { interval: 7, due: 1, reps: 2, lapses: 0, last: 1 },
    '要写进库的那条必须带着回顾进度');
});

test('what mergeById says to write never drops review state', () => {
  const { cards } = importWeRead(loadFixture());
  const stored = cards.map((c) => ({ ...c, text: c.text + '（旧）', review: { interval: 3, due: 9, reps: 1, lapses: 0, last: 9 } }));
  const { changed } = mergeById(stored, cards);
  assert.equal(changed.length, cards.length, '正文都变了，所以每条都要写');
  for (const c of changed) {
    assert.ok(c.review, `${c.id} 写回库时丢了 review，这正是那个数据丢失 bug`);
  }
});

test('re-importing the same data adds nothing', () => {
  const { cards } = importWeRead(loadFixture());
  const { cards: after, added, updated } = mergeById(cards, cards);
  assert.equal(added, 0);
  assert.equal(updated, 0);
  assert.equal(after.length, cards.length);
});

test('re-import preserves review state that the source knows nothing about', () => {
  const { cards } = importWeRead(loadFixture());
  const withState = cards.map((c, i) => (i === 0 ? { ...c, review: { interval: 21, due: 1234 } } : c));
  const { cards: after } = mergeById(withState, cards);
  const target = after.find((c) => c.id === cards[0].id);
  assert.deepEqual(target.review, { interval: 21, due: 1234 }, 'scheduling must survive a re-import');
});

test('an edited highlight updates its text but keeps its schedule', () => {
  const { cards } = importWeRead(loadFixture());
  const stored = [{ ...cards[0], review: { interval: 5, due: 99 } }];
  const edited = [{ ...cards[0], text: '作者后来改过这句话' }];
  const { cards: after, updated } = mergeById(stored, edited);
  assert.equal(updated, 1);
  assert.equal(after[0].text, '作者后来改过这句话');
  assert.deepEqual(after[0].review, { interval: 5, due: 99 });
});

test('malformed input is refused rather than silently dropped into the library', () => {
  assert.deepEqual(importWeReadBook(null), { cards: [], skipped: 0 });
  assert.deepEqual(importWeReadBook({}), { cards: [], skipped: 0 });
  const noId = { reviews: { reviews: [{ review: { abstract: 'x' } }] } };
  assert.equal(importWeReadBook(noId).skipped, 1);
  const empty = { reviews: { reviews: [{ review: { reviewId: 'r1', abstract: '  ', content: '' } }] } };
  assert.equal(importWeReadBook(empty).skipped, 1);
});

// The bookmarklet is what real users will use, so its output is a fixture in its own right:
// pulled by actually clicking it on weread.qq.com on 2026-09-07.
function loadBookmarkletExport() {
  return JSON.parse(readFileSync(join(FIX, 'bookmarklet-export.json'), 'utf8'));
}

test('the bookmarklet export is one file holding every book', () => {
  const j = loadBookmarkletExport();
  assert.equal(j.source, 'weread');
  assert.equal(j.books.length, 17);
  assert.ok(Number.isInteger(j.exportedAt));
});

test('flatten unwraps the bookmarklet shape and passes per-book files through', () => {
  assert.equal(flatten([loadBookmarkletExport()]).length, 17);
  assert.equal(flatten(loadFixture()).length, 17, 'per-book files are already flat');
  assert.deepEqual(flatten([null, undefined, 42, 'x']), [], 'junk is dropped, not crashed on');
});

test('the bookmarklet export imports to exactly the same cards as the per-book files', () => {
  const viaTool = importWeRead(loadFixture());
  const viaBookmarklet = importWeRead([loadBookmarkletExport()]);
  assert.equal(viaBookmarklet.cards.length, viaTool.cards.length);
  assert.equal(viaBookmarklet.skipped, viaTool.skipped);
  assert.deepEqual(
    viaBookmarklet.cards.map((c) => c.id),
    viaTool.cards.map((c) => c.id),
    '两条导入路径必须产出完全一致的结果，否则用户换个方式导入就会重复',
  );
});

test('importing both shapes together does not duplicate anything', () => {
  const { cards } = importWeRead([...loadFixture(), loadBookmarkletExport()]);
  assert.equal(cards.length, 92, '同一批笔记两种格式一起丢进来，仍然是 92 条');
});

test('validate catches a millisecond timestamp, the classic import bug', () => {
  const { cards } = importWeRead(loadFixture());
  const ms = { ...cards[0], createdAt: cards[0].createdAt * 1000 };
  assert.ok(validate(ms).some((p) => p.includes('milliseconds')));
});
