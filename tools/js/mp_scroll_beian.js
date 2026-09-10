// Scroll the 备案与认证 section into view so it can be read from a screenshot.
// Text probing has missed this card twice while screenshots showed it plainly, so this stops
// trying to identify the control by DOM shape and just puts it on screen.
(() => {
  const H = String.fromCharCode(22791, 26696, 19982, 35748, 35777); // 备案与认证
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const head = [...document.querySelectorAll('*')]
    .filter((e) => vis(e) && (e.innerText || '').trim() === H)
    .pop();
  if (!head) return { ok: false, why: 'no 备案与认证 heading' };
  head.scrollIntoView({ block: 'start' });
  return { ok: true, top: Math.round(head.getBoundingClientRect().top) };
})();
