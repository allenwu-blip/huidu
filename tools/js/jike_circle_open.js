// Click the 圈子 picker so its suggestion list renders, then report what showed up.
// Done as a separate step from choosing: on 即刻 the list is fetched, and picking blind
// risks landing the post in the wrong circle — which cannot be undone without deleting it.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const input = [...document.querySelectorAll('input')].filter(vis)
    .find((i) => /圈子/.test(i.placeholder || ''));
  if (!input) return { ok: false, why: 'no 圈子 input visible' };
  input.focus();
  input.click();
  return { ok: true, placeholder: input.placeholder, isActive: document.activeElement === input };
})();
