/**
 * 微信读书取书签 — readable source. tools/build-bookmarklet.mjs turns this into the
 * javascript: one-liner that the app's import page hands to the user.
 *
 * Why a bookmarklet and not a Python script or a browser extension:
 *   - 微信读书 App has no "export all notes as text". Every existing tool on GitHub
 *     (WeRead-to-Readwise, weread-toolbox, weread2md) talks to the same web endpoints.
 *   - A bookmarklet needs no install, no store review, no Python, and reuses the login
 *     the reader already has in their normal browser.
 *
 * It runs on weread.qq.com, reads only that reader's own notes, and downloads a file.
 * Nothing is sent anywhere.
 */
(async () => {
  const TAG = '[百回读]';
  if (!location.hostname.endsWith('weread.qq.com')) {
    alert('请先打开 weread.qq.com 并登录，然后再点这个书签。');
    return;
  }

  // a small fixed banner beats alert(): the whole pull takes a few seconds
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;z-index:2147483647;right:18px;bottom:18px;max-width:320px;padding:14px 16px;' +
    'background:#1e1b16;color:#ece6dc;border-radius:12px;font:14px/1.6 system-ui,sans-serif;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.35);white-space:pre-wrap';
  document.body.appendChild(box);
  const say = (s) => {
    box.textContent = TAG + ' ' + s;
  };

  const get = async (u) => {
    const r = await fetch(u, { credentials: 'include', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };

  try {
    say('正在读取你的笔记列表…');
    const all = await get('/web/review/list?listType=11&mine=1&synckey=0');
    const books = new Map();
    for (const it of all.reviews || []) {
      const rv = it.review || it;
      const bk = rv.book || {};
      if (bk.bookId) books.set(bk.bookId, bk.title || '');
    }
    if (!books.size) {
      say('没有找到任何划线。\n确认这是你自己的账号，并且在微信读书里划过线。');
      setTimeout(() => box.remove(), 8000);
      return;
    }

    const out = [];
    let i = 0;
    for (const [bookId, title] of books) {
      i++;
      say(`正在导出 ${i}/${books.size}：${title.slice(0, 18)}`);
      let bookmarks = null;
      let reviews = null;
      try {
        bookmarks = await get('/web/book/bookmarklist?bookId=' + encodeURIComponent(bookId));
      } catch (e) {
        /* 有的书拿不到划线，跳过即可 */
      }
      try {
        reviews = await get(
          '/web/review/list?bookId=' + encodeURIComponent(bookId) + '&listType=11&mine=1&synckey=0',
        );
      } catch (e) {
        /* 同上 */
      }
      out.push({ bookId, title, bookmarks, reviews });
      await new Promise((r) => setTimeout(r, 250)); // 别把接口打急了
    }

    const payload = JSON.stringify(
      { source: 'weread', exportedAt: Math.floor(Date.now() / 1000), books: out },
      null,
      0,
    );
    const name = `weread-${new Date().toISOString().slice(0, 10)}.json`;

    let saved = false;
    try {
      const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      saved = true;
    } catch (e) {
      saved = false;
    }

    if (saved) {
      say(`导出完成：${books.size} 本书。\n文件 ${name} 已存到下载文件夹，把它拖进「百回读」就行。`);
    } else {
      // CSP blocked the blob download — fall back to the clipboard
      try {
        await navigator.clipboard.writeText(payload);
        say(`浏览器挡住了下载。\n内容已复制到剪贴板，粘贴保存成 ${name} 再拖进「百回读」。`);
      } catch (e2) {
        say('导出失败，浏览器同时挡住了下载和剪贴板。请换 Chrome 或 Edge 再试。');
      }
    }
    setTimeout(() => box.remove(), 15000);
  } catch (err) {
    say('出错了：' + (err && err.message ? err.message : err) + '\n多半是登录过期，刷新页面重新登录再试。');
    setTimeout(() => box.remove(), 12000);
  }
})();
