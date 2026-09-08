// Focus the 圈子 input and select its whole contents, so the next Input.insertText replaces
// the previous query rather than appending to it.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const input = [...document.querySelectorAll('input')].filter(vis)
    .find((i) => /圈子/.test(i.placeholder || '') || /_input_/.test(i.className || ''));
  if (!input) return { ok: false, why: 'circle input not found' };
  input.focus();
  input.select();
  return { ok: true, was: input.value, isActive: document.activeElement === input };
})();
