import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, '..', 'fixtures');
const MP = join(HERE, '..', 'mp');
const require = createRequire(import.meta.url);

/**
 * Run the mini program's page logic under a stubbed `wx`.
 *
 * WeChat DevTools is not installed here, so "it compiles" is all the syntax check proves. These
 * tests drive the actual Page objects against the real 92-highlight fixture, which is what
 * catches a wrong property name or a bad reference before it reaches a phone.
 */
function makeWx() {
  const storage = new Map();
  const toasts = [];
  const modals = [];
  return {
    wx: {
      getStorageSync: (k) => (storage.has(k) ? storage.get(k) : ''),
      setStorageSync: (k, v) => storage.set(k, v),
      removeStorageSync: (k) => storage.delete(k),
      getStorageInfoSync: () => ({ currentSize: 12, limitSize: 10240, keys: [...storage.keys()] }),
      showToast: (o) => toasts.push(o),
      showModal: (o) => { modals.push(o); if (o.success) o.success({ confirm: false }); },
      switchTab: () => {},
      setClipboardData: (o) => { if (o.success) o.success(); },
      chooseMessageFile: () => {},
      getFileSystemManager: () => ({ readFileSync: (p) => readFileSync(p, 'utf8') }),
    },
    storage,
    toasts,
    modals,
  };
}

/** Load a Page module and hand back the config object it registered. */
function loadPage(rel, env) {
  let captured = null;
  global.Page = (cfg) => { captured = cfg; };
  global.App = () => {};
  global.wx = env.wx;
  global.getApp = () => ({ globalData: {} });
  delete require.cache[require.resolve(join(MP, rel))];
  require(join(MP, rel));
  assert.ok(captured, `${rel} did not call Page()`);
  // give it the setData/data pair a real page has
  captured.data = JSON.parse(JSON.stringify(captured.data || {}));
  captured.setData = function (patch, cb) {
    Object.assign(this.data, patch);
    if (cb) cb.call(this);
  };
  return captured;
}

function fixtureBlobs() {
  return readdirSync(FIX)
    .filter((f) => f.startsWith('weread_') && f.endsWith('.json'))
    .map((f) => join(FIX, f));
}

test('store survives a corrupt blob instead of bricking the app', () => {
  const env = makeWx();
  global.wx = env.wx;
  delete require.cache[require.resolve(join(MP, 'utils/store.js'))];
  const store = require(join(MP, 'utils/store.js'));
  env.storage.set(store.KEY, '{ this is not json');
  assert.deepEqual(store.readAll(), [], '坏数据必须返回空，而不是抛异常');
});

test('import page ingests the real fixture and reports honest counts', () => {
  const env = makeWx();
  const page = loadPage('pages/import/import.js', env);
  page.ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));

  assert.equal(page.data.total, 92, '92 张卡进库');
  assert.equal(page.data.books, 15, '15 本书有正文');
  const joined = page.data.log.join(' ');
  assert.ok(joined.includes('跳过 2 条'), '两条纯星级评分必须被说明，而不是悄悄消失');
  assert.ok(joined.includes('新增 92 条'));
});

test('re-importing does not wipe review progress', () => {
  const env = makeWx();
  const files = fixtureBlobs().map((p) => ({ path: p, name: p }));

  const imp = loadPage('pages/import/import.js', env);
  imp.ingest(files);

  // answer one card, then import the very same files again
  const rev = loadPage('pages/review/review.js', env);
  rev.onShow();
  const firstId = rev.data.card.id;
  rev.onGot();

  delete require.cache[require.resolve(join(MP, 'utils/store.js'))];
  const store = require(join(MP, 'utils/store.js'));
  const before = store.readAll().find((c) => c.id === firstId);
  assert.ok(before.review, '答过的卡应该有 review');

  const imp2 = loadPage('pages/import/import.js', env);
  imp2.ingest(files);
  const after = store.readAll().find((c) => c.id === firstId);
  assert.ok(after.review, '重新导入不能抹掉回顾进度');
  assert.deepEqual(after.review, before.review);
  assert.equal(imp2.data.total, 92, '重复导入不应该产生重复卡片');
});

test('review page shows a card with everything the template binds', () => {
  const env = makeWx();
  loadPage('pages/import/import.js', env).ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));
  const page = loadPage('pages/review/review.js', env);
  page.onShow();

  assert.equal(page.data.empty, false);
  assert.equal(page.data.done, false);
  assert.ok(page.data.card, '应该有一张卡');
  assert.equal(page.data.batch.length, 5, '第一天给 5 张新卡');
  for (const k of ['cloth', 'ago', 'month', 'seen']) {
    assert.ok(page.data[k], `模板绑定的 ${k} 不能为空`);
  }
  assert.match(page.data.cloth, /^hsl\(/, 'cloth 必须是可用的颜色字符串');
  assert.equal(page.data.noteOpen, false, '当时写的想法默认收起——这是产品唯一的设计主张');
});

test('the two buttons differ, and the echo says how', () => {
  const env = makeWx();
  loadPage('pages/import/import.js', env).ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));

  const a = loadPage('pages/review/review.js', env);
  a.onShow();
  a.onGot();
  assert.ok(a.data.echo.includes('3 天后见'), `记住了应说 3 天后见，实际：${a.data.echo}`);

  const env2 = makeWx();
  loadPage('pages/import/import.js', env2).ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));
  const b = loadPage('pages/review/review.js', env2);
  b.onShow();
  b.onAgain();
  assert.ok(b.data.echo.includes('明天见'), `再来应说明天见，实际：${b.data.echo}`);
});

test('an empty install shows the blank state, not a crash', () => {
  const env = makeWx();
  const page = loadPage('pages/review/review.js', env);
  page.onShow();
  assert.equal(page.data.empty, true);
  assert.equal(page.data.card, null);
});

test('library groups by book and never renders an undefined field', () => {
  const env = makeWx();
  loadPage('pages/import/import.js', env).ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));
  const page = loadPage('pages/library/library.js', env);
  page.onShow();

  assert.equal(page.data.books.length, 15);
  assert.equal(page.data.stats.total, 92);
  const total = page.data.books.reduce((n, b) => n + b.count, 0);
  assert.equal(total, 92, '分组后条数必须守恒');

  for (const b of page.data.books) {
    assert.ok(b.title && b.cloth && b.count > 0);
    for (const it of b.items) {
      assert.ok(it.line, '每条都要有可显示的正文');
      assert.ok(it.ago, '每条都要有时间距离');
      assert.ok(it.tag);
    }
    for (let i = 1; i < b.items.length; i++) {
      assert.ok(b.items[i - 1].createdAt >= b.items[i].createdAt, '书内按时间倒序');
    }
  }
});

test('books are ordered by how much you highlighted in them', () => {
  const env = makeWx();
  loadPage('pages/import/import.js', env).ingest(fixtureBlobs().map((p) => ({ path: p, name: p })));
  const page = loadPage('pages/library/library.js', env);
  page.onShow();
  for (let i = 1; i < page.data.books.length; i++) {
    assert.ok(page.data.books[i - 1].count >= page.data.books[i].count);
  }
});
