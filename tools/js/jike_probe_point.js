// The blue-dotted chip sits left of the grey suggestions (which start at page x=560, y=211)
// and carries a different class, so class-based queries missed it. Ask the document what is
// actually painted along that row instead of guessing at selectors a third time.
(() => {
  const y = 218;
  const seen = new Map();
  for (let x = 430; x <= 700; x += 10) {
    const el = document.elementFromPoint(x, y);
    if (!el) continue;
    const t = (el.innerText || '').trim();
    const key = el.tagName + '|' + t.slice(0, 20) + '|' + (el.className || '').toString().slice(0, 30);
    if (seen.has(key)) continue;
    const r = el.getBoundingClientRect();
    seen.set(key, {
      x,
      tag: el.tagName.toLowerCase(),
      text: t.slice(0, 24),
      cls: (el.className || '').toString().slice(0, 50),
      left: Math.round(r.left),
      width: Math.round(r.width),
    });
  }
  return { row: [...seen.values()] };
})();
