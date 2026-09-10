// Navigate to 虚拟支付 through the sidebar instead of a guessed URL — the guessed one loaded
// the shell with an empty content area, which looks like "nothing here" rather than "wrong page".
// Returns the href so the real URL can be recorded for next time.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const byText = (t) =>
    [...document.querySelectorAll('a,div,span,li')].filter(
      (e) => vis(e) && (e.innerText || '').trim() === t && e.getBoundingClientRect().height < 70,
    );

  // expand 支付与交易 first; its children are collapsed until it is clicked
  const group = byText('支付与交易')[0];
  if (group) group.click();

  const target = byText('虚拟支付').pop();
  if (!target) {
    return {
      ok: false,
      why: '虚拟支付 not visible in the sidebar',
      sidebar: [...document.querySelectorAll('a,li,div')]
        .filter((e) => vis(e) && (e.innerText || '').trim().length > 1 && (e.innerText || '').trim().length < 8)
        .map((e) => (e.innerText || '').trim())
        .slice(0, 30),
    };
  }
  const href = target.closest('a') ? target.closest('a').getAttribute('href') : null;
  target.click();
  return { ok: true, clicked: '虚拟支付', href };
})();
