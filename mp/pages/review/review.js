const store = require('../../utils/store.js');
const ui = require('../../utils/ui.js');
const review = require('../../lib/review.js');

/**
 * 今日 — the reading screen.
 *
 * All scheduling comes from lib/review.js, which is generated from src/review.mjs, so the
 * mini program and the web app cannot drift apart on what comes back when.
 *
 * The note is collapsed by default. That is the one real design decision in the product: what
 * makes a reader stop is not the sentence from the book, it is "what was I thinking then",
 * and showing both at once throws that away.
 */
Page({
  data: {
    ready: false,
    empty: false,     // nothing imported at all
    done: false,      // today's batch finished
    batch: [],
    at: 0,
    left: 0,          // pages still behind this one today, drawn as a pile (capped at 2)
    card: null,
    cloth: '#8a8071',
    glyph: '书',      // the 藏书章 glyph: first character of the title
    ago: '',
    seen: '',
    folio: '',
    dueGot: '',       // what 记住了 would do, said on the button
    dueAgain: '',     // what 再来 would do
    hang: false,
    noteOpen: false,
    stamp: '',        // '记' or '再' while the page is being stamped and turned
    leaving: '',      // 'got' | 'again' drives the exit animation
    busy: false,
  },

  onShow() {
    this.load();
  },

  load() {
    const cards = store.readAll();
    if (!cards.length) {
      this.setData({ ready: true, empty: true, done: false, card: null });
      return;
    }
    const now = ui.nowSec();
    const batch = review.pickDaily(cards, { now: now, size: 10, maxNew: 5 });
    if (!batch.length) {
      this.setData({ ready: true, empty: false, done: true, card: null });
      return;
    }
    this.setData({ ready: true, empty: false, done: false, batch: batch, at: 0 }, () => {
      this.show(0);
    });
  },

  show(i) {
    const c = this.data.batch[i];
    if (!c) {
      this.load();
      return;
    }
    const now = ui.nowSec();
    // grade() is pure, so asking it what each button would do costs nothing, and the two
    // buttons stop looking interchangeable
    const due = function (outcome) {
      const d = review.grade(c, outcome, now).review.interval;
      return d === 1 ? '明天见' : ui.cnNum(d) + '天后见';
    };
    this.setData({
      at: i,
      left: Math.min(2, this.data.batch.length - i - 1),
      card: c,
      cloth: ui.clothCss(c.bookId),
      glyph: ui.chopGlyph(c.bookTitle),
      ago: ui.cnify(ui.agoText(c.createdAt, now)),
      seen: review.isNew(c) ? '第一次见' : '第' + ui.cnNum(c.review.reps + 1) + '次见',
      folio: ui.cnNum(i + 1) + '／' + ui.cnNum(this.data.batch.length),
      dueGot: due('got'),
      dueAgain: due('again'),
      hang: ui.hangsFirstGlyph(c.text),
      noteOpen: false,
      stamp: '',
      leaving: '',
    });
  },

  toggleNote() {
    this.setData({ noteOpen: !this.data.noteOpen });
  },

  onGot() {
    this.answer('got');
  },

  onAgain() {
    this.answer('again');
  },

  answer(outcome) {
    if (this.data.busy || !this.data.card) return;
    this.setData({ busy: true });

    const now = ui.nowSec();
    const graded = review.grade(this.data.card, outcome, now);
    store.putOne(graded);

    // stamp the page, then let it turn; the next one rises when this one is gone
    this.setData({ stamp: outcome === 'got' ? '记' : '再', leaving: outcome });

    setTimeout(() => {
      const next = this.data.at + 1;
      this.setData({ busy: false });
      if (next >= this.data.batch.length) this.load();
      else this.show(next);
    }, 900);
  },

  goImport() {
    wx.switchTab({ url: '/pages/import/import' });
  },
});
