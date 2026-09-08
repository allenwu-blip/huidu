/**
 * The review engine: which cards come back today, and what happens when the reader answers.
 *
 * Deliberately small. Two buttons only — 记住了 / 再来 — because the whole product promise is
 * "a few old highlights come back each day", not "grade yourself 0-5 on recall quality".
 *
 * Everything is pure and deterministic: no Date.now() inside, no randomness. `now` is always
 * passed in, so the same inputs always produce the same batch and the tests never flake.
 * Time is epoch SECONDS everywhere, matching Card.createdAt.
 */

const DAY = 86400;

/**
 * Intervals in days. Roughly doubling, which is what spaced repetition needs; the exact ladder
 * matters far less than showing up daily, so it is a plain table rather than a tuned formula.
 */
const STEPS = [1, 3, 7, 16, 35, 75, 160, 340];

/** @typedef {{interval: number, due: number, reps: number, lapses: number}} ReviewState */

function isNew(card) {
  return !card.review;
}

function isDue(card, now) {
  return Boolean(card.review) && card.review.due <= now;
}

/** Start of the UTC day containing `now`, so a card due "today" stays due all day. */
function dayStart(now) {
  return Math.floor(now / DAY) * DAY;
}

/**
 * Answer a card.
 * @param {object} card
 * @param {'got'|'again'} outcome  got = 记住了, again = 再来
 * @param {number} now epoch seconds
 */
function grade(card, outcome, now) {
  if (outcome !== 'got' && outcome !== 'again') {
    throw new TypeError(`unknown outcome: ${outcome}`);
  }
  const prev = card.review ?? { interval: 0, due: 0, reps: 0, lapses: 0 };
  let interval;
  let lapses = prev.lapses;

  if (outcome === 'again') {
    // back to the front of the ladder; the card returns tomorrow
    interval = STEPS[0];
    lapses += 1;
  } else {
    const i = STEPS.indexOf(prev.interval);
    // A card being seen for the first time has no interval to step up from. Starting it at
    // STEPS[0] put it on exactly the same schedule as 再来, so on every new card the two
    // buttons did the same thing — a reader noticed and said so. A first 记住了 therefore
    // enters at STEPS[1], which is the first interval that actually means "not tomorrow".
    interval = i === -1 ? STEPS[1] : STEPS[Math.min(i + 1, STEPS.length - 1)];
  }

  return {
    ...card,
    review: {
      interval,
      due: dayStart(now) + interval * DAY,
      reps: prev.reps + 1,
      lapses,
      // when this card was last answered. Without it the daily cap is unenforceable:
      // a finished batch would simply refill with more new cards forever.
      last: now,
    },
  };
}

/** Was this card answered at any point during the UTC day containing `now`? */
function answeredToday(card, now) {
  return Boolean(card.review) && (card.review.last ?? 0) >= dayStart(now);
}

/**
 * Today's batch: everything overdue first (oldest due first, so nothing rots), then new cards
 * up to `maxNew`. New cards are taken oldest-highlight-first, so the reader meets their own
 * back catalogue in the order they built it.
 *
 * @param {object[]} cards
 * @param {{now: number, size?: number, maxNew?: number}} opts
 */
function pickDaily(cards, { now, size = 10, maxNew = 5 }) {
  if (!Number.isFinite(now)) throw new TypeError('now must be epoch seconds');

  // Budgets are per DAY, not per call. Calling this again after finishing a batch must not
  // hand out a fresh allowance — otherwise "a few highlights a day" becomes an endless feed.
  const doneToday = cards.filter((c) => answeredToday(c, now));
  const newToday = doneToday.filter((c) => c.review.reps === 1).length;
  const slots = Math.max(0, size - doneToday.length);
  const newSlots = Math.max(0, maxNew - newToday);
  if (slots === 0) return [];

  const due = cards
    .filter((c) => isDue(c, now) && !answeredToday(c, now))
    .sort((a, b) => a.review.due - b.review.due || String(a.id).localeCompare(String(b.id)));

  const fresh = cards
    .filter(isNew)
    .sort((a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)));

  const batch = due.slice(0, slots);
  const room = Math.max(0, Math.min(slots - batch.length, newSlots));
  return batch.concat(fresh.slice(0, room));
}

/** Numbers for the dashboard the briefing asks for. */
function stats(cards, now) {
  const total = cards.length;
  const newCount = cards.filter(isNew).length;
  const dueCount = cards.filter((c) => isDue(c, now)).length;
  const reviewed = total - newCount;
  const lapses = cards.reduce((n, c) => n + (c.review?.lapses ?? 0), 0);
  return { total, new: newCount, due: dueCount, reviewed, lapses };
}

module.exports = { DAY, STEPS, isNew, isDue, dayStart, grade, answeredToday, pickDaily, stats };
