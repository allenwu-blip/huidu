// Enter the 备案 flow from the home page card. The card is a div with no href, so it is
// clicked rather than navigated to; the innermost matching node is used so the click lands on
// the card itself and not on a wrapper that ignores it.
(() => {
  const LABEL = String.fromCharCode(23567, 31243, 24207, 22791, 26696); // 小程序备案
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const cands = [...document.querySelectorAll('a,button,div,span')]
    .filter((e) => vis(e) && (e.innerText || '').trim().startsWith(LABEL) && (e.innerText || '').trim().length < 24);
  if (!cands.length) return { ok: false, why: 'no 小程序备案 card' };

  // prefer an explicit action button inside the card if one exists
  const card = cands[0];
  const action = [...card.querySelectorAll('a,button')].filter(vis)[0];
  (action || cands[cands.length - 1]).click();
  return { ok: true, clicked: ((action || cands[cands.length - 1]).innerText || '').trim().slice(0, 20) };
})();
