// Click 备忘录 in the open cascade's right-hand column.
//
// The earlier probe required children.length===0 and a small height, and matched nothing —
// yet the screenshot showed the column plainly. So match on exact text only, take the
// deepest node with that text, and report the box it landed on so a mis-click is visible.
(() => {
  const MEMO = String.fromCharCode(22791, 24536, 24405); // 备忘录
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const hits = [...document.querySelectorAll('*')]
    .filter((e) => vis(e) && (e.innerText || '').trim() === MEMO);
  if (!hits.length) return { ok: false, why: 'no element whose text is exactly 备忘录' };

  const el = hits[hits.length - 1]; // deepest
  const r = el.getBoundingClientRect();
  el.click();
  return {
    ok: true,
    tag: el.tagName.toLowerCase(),
    x: Math.round(r.left),
    y: Math.round(r.top),
    // right-hand column sits well to the right of the left column; a low x would mean
    // the click landed in the wrong list
    looksRightColumn: r.left > 700,
  };
})();
