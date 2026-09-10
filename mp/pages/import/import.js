const store = require('../../utils/store.js');
const schema = require('../../lib/schema.js');
const importer = require('../../lib/import-weread.js');

/**
 * 导入 — get the reader's own highlights in.
 *
 * A mini program cannot run the browser bookmarklet, and web-view is unavailable to 个人类型
 * accounts, so the only route is wx.chooseMessageFile: the reader runs the bookmarklet on a
 * computer, sends the resulting json to 文件传输助手, then picks it here.
 *
 * wx.chooseMessageFile has no entity restriction (checked against the official API doc), which
 * is the single fact this whole mini program depends on.
 */
Page({
  data: {
    log: [],
    total: 0,
    books: 0,
    usedKB: null,
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cards = store.readAll();
    const ids = {};
    cards.forEach((c) => { ids[c.bookId] = 1; });
    const size = store.sizeInfo();
    this.setData({
      total: cards.length,
      books: Object.keys(ids).length,
      usedKB: size.usedKB,
    });
  },

  say(line) {
    this.setData({ log: this.data.log.concat([line]) });
  },

  chooseFile() {
    const self = this;
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      extension: ['json'],
      success(res) {
        self.setData({ log: [] });
        self.ingest(res.tempFiles || []);
      },
      fail(err) {
        // cancelling is a normal outcome, not an error worth shouting about
        if (err && String(err.errMsg || '').indexOf('cancel') === -1) {
          self.say('打开聊天文件失败：' + (err.errMsg || err));
        }
      },
    });
  },

  ingest(files) {
    if (!files.length) return;
    const fs = wx.getFileSystemManager();
    const blobs = [];

    files.forEach((f) => {
      try {
        const txt = fs.readFileSync(f.path, 'utf8');
        blobs.push(JSON.parse(txt));
      } catch (e) {
        this.say('✗ ' + (f.name || '文件') + ' 读不出或不是合法 JSON，跳过');
      }
    });
    if (!blobs.length) {
      this.say('没有可用的文件。');
      return;
    }

    const res = importer.importWeRead(blobs);
    const good = res.cards.filter((c) => schema.validate(c).length === 0);
    const bad = res.cards.length - good.length;

    const existing = store.readAll();
    const merged = schema.mergeById(existing, good);

    // Write merged.cards, never `good`. The freshly parsed cards carry no review state, so
    // persisting them wipes every schedule — that bug shipped once on the web build. wx storage
    // holds the library as one blob, so the whole merged array goes back rather than a delta.
    const all = merged.cards;
    store.writeAll(all);

    this.say('读了 ' + files.length + ' 个文件，解析出 ' + res.cards.length + ' 条');
    if (res.skipped) this.say('跳过 ' + res.skipped + ' 条（纯星级评分，没有正文）');
    if (bad) this.say('✗ ' + bad + ' 条格式不合规，没有导入');
    this.say('新增 ' + merged.added + ' 条，更新 ' + merged.updated + ' 条，现在共 ' + all.length + ' 条');

    this.refresh();
    wx.showToast({ title: '导入完成', icon: 'success' });
  },

  copyTip() {
    wx.setClipboardData({
      data: 'https://allenwu-blip.github.io/huidu/',
      success() {
        wx.showToast({ title: '地址已复制', icon: 'none' });
      },
    });
  },

  confirmClear() {
    const self = this;
    wx.showModal({
      title: '清空本机数据',
      content: '会删掉这台手机上保存的全部划线和回顾进度，不可撤销。',
      confirmColor: '#b0302a',
      success(r) {
        if (!r.confirm) return;
        store.clearAll();
        self.setData({ log: ['已清空。'] });
        self.refresh();
      },
    });
  },
});
