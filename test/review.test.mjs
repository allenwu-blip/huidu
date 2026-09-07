import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { importWeRead } from '../src/import-weread.mjs';
import { DAY, STEPS, grade, isDue, isNew, pickDaily, dayStart, stats, answeredToday } from '../src/review.mjs';

/** Answer every card in a batch, returning the updated library. */
function answerAll(cards, batch, outcome, now) {
  let out = cards;
  for (const c of batch) {
    const g = grade(c, outcome, now);
    out = out.map((x) => (x.id === g.id ? g : x));
  }
  return out;
}

const FIX = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const NOW = 1757000000; // fixed point in 2025, so nothing here depends on the real clock

function realCards() {
  const blobs = readdirSync(FIX)
    .filter((f) => f.startsWith('weread_') && f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(FIX, f), 'utf8')));
  return importWeRead(blobs).cards;
}

test('a fresh import is all new and nothing is due', () => {
  const cards = realCards();
  assert.equal(cards.filter(isNew).length, 92);
  assert.equal(cards.filter((c) => isDue(c, NOW)).length, 0);
});

test('day one gives the reader a small batch, not all 92 highlights', () => {
  const batch = pickDaily(realCards(), { now: NOW, size: 10, maxNew: 5 });
  assert.equal(batch.length, 5, 'only maxNew cards on a day with nothing due');
  assert.ok(batch.every(isNew));
});

test('new cards arrive oldest highlight first', () => {
  const batch = pickDaily(realCards(), { now: NOW, size: 10, maxNew: 5 });
  for (let i = 1; i < batch.length; i++) {
    assert.ok(batch[i - 1].createdAt <= batch[i].createdAt);
  }
});

test('答对 walks up the ladder, 答错 drops back to one day', () => {
  const c = realCards()[0];
  let g = grade(c, 'got', NOW);
  assert.equal(g.review.interval, 1);
  assert.equal(g.review.reps, 1);
  assert.equal(g.review.lapses, 0);

  g = grade(g, 'got', NOW);
  assert.equal(g.review.interval, 3);
  g = grade(g, 'got', NOW);
  assert.equal(g.review.interval, 7);

  g = grade(g, 'again', NOW);
  assert.equal(g.review.interval, 1, 'a miss sends it back to tomorrow');
  assert.equal(g.review.lapses, 1);
  assert.equal(g.review.reps, 4, 'reps counts every answer, including misses');
});

test('the ladder tops out instead of running away', () => {
  let c = realCards()[0];
  for (let i = 0; i < 40; i++) c = grade(c, 'got', NOW);
  assert.equal(c.review.interval, STEPS[STEPS.length - 1]);
});

test('a graded card is due exactly interval days later, and not before', () => {
  const c = grade(realCards()[0], 'got', NOW);
  assert.equal(isDue(c, NOW), false, 'not due the moment it was answered');
  assert.equal(isDue(c, c.review.due - 1), false);
  assert.equal(isDue(c, c.review.due), true);
});

test('due time snaps to the start of the day so it stays due all day', () => {
  const noon = dayStart(NOW) + 12 * 3600;
  const evening = dayStart(NOW) + 22 * 3600;
  assert.equal(grade(realCards()[0], 'got', noon).review.due, grade(realCards()[0], 'got', evening).review.due);
});

test('overdue cards come before new ones and oldest-due first', () => {
  const cards = realCards();
  const a = { ...cards[0], review: { interval: 3, due: NOW - 5 * DAY, reps: 2, lapses: 0 } };
  const b = { ...cards[1], review: { interval: 3, due: NOW - 20 * DAY, reps: 2, lapses: 0 } };
  const batch = pickDaily([...cards.slice(2), a, b], { now: NOW, size: 10, maxNew: 5 });
  assert.equal(batch[0].id, b.id, 'the most overdue card is first');
  assert.equal(batch[1].id, a.id);
  assert.ok(batch.slice(2).every(isNew));
});

test('a backlog of due cards crowds out new ones rather than exploding the batch', () => {
  const cards = realCards().map((c, i) =>
    i < 30 ? { ...c, review: { interval: 3, due: NOW - (i + 1) * DAY, reps: 1, lapses: 0 } } : c,
  );
  const batch = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  assert.equal(batch.length, 10, 'never more than size');
  assert.ok(batch.every((c) => !isNew(c)), 'no new cards while there is a backlog');
});

test('a full pass over the real library eventually schedules every card', () => {
  let cards = realCards();
  let now = NOW;
  const touched = new Set();
  for (let day = 0; day < 40; day++) {
    for (const c of pickDaily(cards, { now, size: 10, maxNew: 5 })) {
      touched.add(c.id);
      const graded = grade(c, 'got', now);
      cards = cards.map((x) => (x.id === graded.id ? graded : x));
    }
    now += DAY;
  }
  assert.equal(touched.size, 92, 'every highlight surfaced at least once within 40 days');
  assert.equal(cards.filter(isNew).length, 0);
});

test('grade refuses an outcome it does not understand', () => {
  assert.throws(() => grade(realCards()[0], 'maybe', NOW), TypeError);
});

test('pickDaily refuses a missing clock instead of silently using 1970', () => {
  assert.throws(() => pickDaily(realCards(), { now: undefined }), TypeError);
});

// Regression: the browser end-to-end run on 2026-09-06 finished a 5-card batch and the app
// immediately handed out 5 more, so the daily cap meant nothing and the reader could grind
// the whole library in one sitting. The unit tests missed it because they only ever called
// pickDaily once per simulated day.
test('finishing today batch does not refill: the budget is per day, not per call', () => {
  let cards = realCards();
  const first = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  assert.equal(first.length, 5);
  cards = answerAll(cards, first, 'got', NOW);
  assert.deepEqual(pickDaily(cards, { now: NOW, size: 10, maxNew: 5 }), [], '今天读完了');
});

test('a part-finished batch resumes with only the remaining allowance', () => {
  let cards = realCards();
  const first = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  cards = answerAll(cards, first.slice(0, 2), 'got', NOW);
  const rest = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  assert.equal(rest.length, 3, '2 already answered, so 3 left today');
  assert.ok(rest.every((c) => !answeredToday(c, NOW)));
});

test('tomorrow brings a fresh allowance', () => {
  let cards = realCards();
  cards = answerAll(cards, pickDaily(cards, { now: NOW, size: 10, maxNew: 5 }), 'got', NOW);
  assert.equal(pickDaily(cards, { now: NOW, size: 10, maxNew: 5 }).length, 0);
  const next = pickDaily(cards, { now: NOW + DAY, size: 10, maxNew: 5 });
  // yesterday's 5 were graded 'got' at interval 1, so they come due today; 5 new ones fill
  // the rest of the size-10 budget.
  assert.equal(next.length, 10);
  assert.equal(next.filter((c) => !isNew(c)).length, 5, '昨天那 5 张回来了');
  assert.equal(next.filter(isNew).length, 5, '再加 5 张没读过的');
});

test('a card answered today never reappears the same day, even when overdue', () => {
  let cards = realCards();
  const c = { ...cards[0], review: { interval: 1, due: NOW - 10 * DAY, reps: 3, lapses: 0, last: NOW - 10 * DAY } };
  cards = [c, ...cards.slice(1)];
  const batch = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  assert.equal(batch[0].id, c.id, 'overdue card leads the batch');
  cards = answerAll(cards, [batch[0]], 'again', NOW);
  const after = pickDaily(cards, { now: NOW, size: 10, maxNew: 5 });
  assert.ok(!after.some((x) => x.id === c.id), '答完再来的卡不会当天又冒出来');
});

test('grade records when the card was answered', () => {
  const g = grade(realCards()[0], 'got', NOW);
  assert.equal(g.review.last, NOW);
  assert.equal(answeredToday(g, NOW), true);
  assert.equal(answeredToday(g, NOW + DAY), false);
});

test('stats report what the dashboard needs', () => {
  const cards = realCards();
  const s0 = stats(cards, NOW);
  assert.deepEqual(s0, { total: 92, new: 92, due: 0, reviewed: 0, lapses: 0 });

  const one = grade(cards[0], 'again', NOW);
  const s1 = stats([one, ...cards.slice(1)], NOW);
  assert.equal(s1.new, 91);
  assert.equal(s1.reviewed, 1);
  assert.equal(s1.lapses, 1);
});
