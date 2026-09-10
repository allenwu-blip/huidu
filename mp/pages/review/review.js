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
    card: null,
    cloth: '#8a897f',
    ago: '',
    month: '',
    seen: '',
    hang: false,
    noteOpen: false,
    echo: '',
    echoDays: 0,
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
    this.setData({
      at: i,
      card: c,
      cloth: ui.clothCss(c.bookId),
      ago: ui.agoText(c.createdAt, now),
      month: ui.monthText(c.createdAt),
      seen: review.isNew(c) ? '第一次见' : '第 ' + (c.review.reps + 1) + ' 次见',
      hang: ui.hangsFirstGlyph(c.text),
      noteOpen: false,
      echo: '',
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

    // Say what the choice did. Without this the two buttons feel identical even when they
    // schedule differently, because the card just disappears either way — a reader said so.
    const d = graded.review.interval;
    this.setData({
      echo: (outcome === 'got' ? '记住了' : '再来') + '　' + (d === 1 ? '明天见' : d + ' 天后见'),
      echoDays: d,
    });

    setTimeout(() => {
      const next = this.data.at + 1;
      this.setData({ busy: false, echo: '' });
      if (next >= this.data.batch.length) this.load();
      else this.show(next);
    }, 700);
  },

  goImport() {
    wx.switchTab({ url: '/pages/import/import' });
  },
});
