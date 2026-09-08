/**
 * WeRead importer.
 *
 * Accepts the shape produced by tools/weread_dump.py: one JSON blob per book, holding the
 * `review/list` response for that book. Written against the real 94-entry fixture pulled from
 * Allen's own account on 2026-09-06, not against a guess at the format.
 *
 * Observed in that fixture and handled here:
 *   - type 1 = a highlight with the reader's note attached (92 of 94)
 *   - type 4 = a book-level review: no abstract, no chapter (2 of 94)
 *   - `abstract` is the highlighted passage, `content` is the reader's own words
 *   - createTime is already epoch SECONDS
 *   - reviewId is unique across the whole fixture, so it is the dedup key
 */

/** WeRead wraps each entry as {review: {...}} in some responses and bare in others. */
function unwrap(entry) {
  return entry && entry.review ? entry.review : entry;
}

function clean(s) {
  if (typeof s !== 'string') return '';
  // WeRead pads abstracts with leading/trailing whitespace and stray full-width spaces
  return s.replace(/　/g, ' ').trim();
}

/**
 * @param {object} blob one parsed weread_<bookId>.json
 * @returns {{cards: import('./schema.mjs').Card[], skipped: number}}
 */
function importWeReadBook(blob) {
  const entries = blob?.reviews?.reviews ?? [];
  const fallbackTitle = blob?.title ?? '';
  const fallbackBookId = blob?.bookId != null ? String(blob.bookId) : '';
  const cards = [];
  let skipped = 0;

  for (const raw of entries) {
    const r = unwrap(raw);
    if (!r || !r.reviewId) {
      skipped++;
      continue;
    }
    const book = r.book ?? {};
    const text = clean(r.abstract);
    const note = clean(r.content);
    if (!text && !note) {
      skipped++;
      continue;
    }
    cards.push({
      id: `weread:${r.reviewId}`,
      source: 'weread',
      bookId: String(r.bookId ?? book.bookId ?? fallbackBookId),
      bookTitle: book.title ?? fallbackTitle,
      bookAuthor: book.author ?? '',
      chapter: clean(r.chapterTitle) || null,
      chapterIdx: Number.isInteger(r.chapterIdx) ? r.chapterIdx : null,
      text,
      note: note || null,
      createdAt: Number(r.createTime) || 0,
    });
  }
  return { cards, skipped };
}

/**
 * Flatten whatever the reader dropped in into a flat list of per-book blobs.
 *
 * Two real shapes exist and both are supported, because both are things a reader will actually
 * hand us:
 *   1. the bookmarklet's single file  {source, exportedAt, books: [ {...}, {...} ]}
 *   2. one file per book              {bookId, title, bookmarks, reviews}
 */
function flatten(blobs) {
  const out = [];
  for (const b of blobs) {
    if (!b || typeof b !== 'object') continue;
    if (Array.isArray(b.books)) out.push(...b.books.filter((x) => x && typeof x === 'object'));
    else out.push(b);
  }
  return out;
}

/** Import many blobs at once, deduping on id. Accepts either shape, mixed freely. */
function importWeRead(blobs) {
  const seen = new Map();
  let skipped = 0;
  for (const b of flatten(blobs)) {
    const res = importWeReadBook(b);
    skipped += res.skipped;
    for (const c of res.cards) seen.set(c.id, c);
  }
  // newest first: that is the order a reader expects when they first open the library
  const cards = [...seen.values()].sort((a, b) => b.createdAt - a.createdAt);
  return { cards, skipped };
}

module.exports = { importWeReadBook, flatten, importWeRead };
