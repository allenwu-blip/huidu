const store = require('../../utils/store.js');
const ui = require('../../utils/ui.js');
const review = require('../../lib/review.js');

/**
 * 书架 — the collection, grouped by book.
 *
 * The counts live here rather than on 今日 for the same reason the web build puts them here:
 * looking at what you have collected is the point of this screen, and measuring your reading
 * while you are doing it is not the point of the other one.
 *
 * WXML cannot call functions during render, so every derived string (colour, "四年前", the
 * interval label) is computed once in JS and bound as plain data.
 */
Page({
  data: {
    ready: false,
    stats: null,
    books: [],
    openId: '',
  },

  onShow() {
    this.load();
  },

  load() {
    const cards = store.readAll();
    const now = ui.nowSec();
    if (!cards.length) {
      this.setData({ ready: true, books: [], stats: null });
      return;
    }

    const s = review.stats(cards, now);
    const left = review.pickDaily(cards, { now: now, size: 10, maxNew: 5 }).length;

    const byBook = {};
    cards.forEach((c) => {
      if (!byBook[c.bookId]) {
        byBook[c.bookId] = { id: c.bookId, title: c.bookTitle, cloth: ui.clothCss(c.bookId), items: [] };
      }
      byBook[c.bookId].items.push({
        id: c.id,
        createdAt: c.createdAt,
        line: c.text || c.note,
        chapter: c.chapter || '',
        ago: ui.agoText(c.createdAt, now),
        tag: review.isNew(c) ? '没读过' : '间隔 ' + c.review.interval + ' 天',
      });
    });

    const books = Object.keys(byBook)
      .map((k) => byBook[k])
      .sort((a, b) => b.items.length - a.items.length);
    books.forEach((b) => {
      b.count = b.items.length;
      // newest highlight first, matching the web build's ordering inside a book
      b.items.sort((x, y) => y.createdAt - x.createdAt);
    });

    this.setData({
      ready: true,
      books: books,
      stats: { left: left, reviewed: s.reviewed, fresh: s.new, total: s.total, bookCount: books.length },
    });
  },

  toggle(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ openId: this.data.openId === id ? '' : id });
  },

  goImport() {
    wx.switchTab({ url: '/pages/import/import' });
  },
});
