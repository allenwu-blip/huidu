/**
 * The one canonical shape every importer must produce.
 *
 * Deliberately flat and source-agnostic: WeRead, Kindle and Cubox all collapse into this,
 * so the review engine never learns where a card came from.
 *
 * Review state is NOT part of an imported card. Import stays pure so a re-import can never
 * reset a card's scheduling — the store merges by `id` and keeps whatever state it already had.
 */

/**
 * @typedef {Object} Card
 * @property {string}  id          stable across re-imports; dedup key
 * @property {'weread'|'kindle'|'cubox'} source
 * @property {string}  bookId
 * @property {string}  bookTitle
 * @property {string}  bookAuthor  '' when the source does not carry it
 * @property {?string} chapter     chapter/section title, null for book-level notes
 * @property {?number} chapterIdx  ordering within the book, null when unknown
 * @property {string}  text        the highlighted passage; '' only for standalone notes
 * @property {?string} note        the reader's own words, null when they only highlighted
 * @property {number}  createdAt   epoch SECONDS (not ms) — every source gets normalised to this
 */

/** Fields a card must have to be storable. */
const REQUIRED = ['id', 'source', 'bookId', 'bookTitle', 'createdAt'];

/**
 * A card is worth reviewing only if it carries something to read back.
 * A note with no highlight is still valid: those are chapter-level thoughts.
 */
function isReviewable(card) {
  return Boolean((card.text && card.text.trim()) || (card.note && card.note.trim()));
}

function validate(card) {
  const problems = [];
  for (const f of REQUIRED) {
    if (card[f] === undefined || card[f] === null || card[f] === '') problems.push(`missing ${f}`);
  }
  if (typeof card.createdAt !== 'number' || !Number.isFinite(card.createdAt)) {
    problems.push('createdAt must be a finite number');
  } else if (card.createdAt > 4102444800) {
    // 2100-01-01 in seconds; catches a source that handed us milliseconds
    problems.push('createdAt looks like milliseconds, expected seconds');
  }
  if (!isReviewable(card)) problems.push('neither text nor note has content');
  return problems;
}

/**
 * Merge freshly imported cards into existing ones, preserving review state.
 *
 * Returns `changed` as well as `cards`: the caller must persist `changed`, never the raw
 * incoming list. Writing the incoming cards is a data-loss bug — they carry no review state,
 * so a re-import silently resets every card's schedule. That bug shipped once; the `changed`
 * array exists so the correct thing is also the easy thing.
 */
function mergeById(existing, incoming) {
  const byId = new Map(existing.map((c) => [c.id, c]));
  const changed = [];
  let added = 0;
  let updated = 0;
  for (const c of incoming) {
    const prev = byId.get(c.id);
    if (!prev) {
      byId.set(c.id, c);
      changed.push(c);
      added++;
    } else {
      // content may have been edited at the source; review state is ours and survives
      const { review, ...rest } = prev;
      const merged = { ...rest, ...c };
      if (review !== undefined) merged.review = review;
      byId.set(c.id, merged);
      if (JSON.stringify(prev) !== JSON.stringify(merged)) {
        changed.push(merged);
        updated++;
      }
    }
  }
  return { cards: [...byId.values()], changed, added, updated };
}

module.exports = { REQUIRED, isReviewable, validate, mergeById };
