// Two exact-text guesses have missed. Stop guessing: dump every small visible element whose
// text mentions 产品, with tag/class/rect, so the real chip can be identified from evidence.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const out = [];
  for (const e of document.querySelectorAll('*')) {
    if (!vis(e)) continue;
    const t = (e.innerText || '').trim();
    if (!t || t.length > 24 || !t.includes('产品')) continue;
    const r = e.getBoundingClientRect();
    if (r.height > 60) continue;
    out.push({
      tag: e.tagName.toLowerCase(),
      text: t,
      codes: [...t].slice(0, 3).map((c) => c.charCodeAt(0)),
      cls: (e.className && e.className.toString ? e.className.toString() : '').slice(0, 60),
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      childCount: e.children.length,
    });
  }
  return { count: out.length, chips: out.slice(0, 20) };
})();
