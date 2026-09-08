// Just the chip texts and their positions, so the right one can be clicked by index.
// All suggestion chips share the class fragment `_item_`, which is the stable handle here.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const chips = [...document.querySelectorAll('div')]
    .filter((e) => vis(e) && /_item_/.test(e.className || '') && (e.innerText || '').trim())
    .map((e, i) => {
      const r = e.getBoundingClientRect();
      return { i, text: (e.innerText || '').trim(), x: Math.round(r.left), y: Math.round(r.top) };
    });
  return { count: chips.length, chips };
})();
