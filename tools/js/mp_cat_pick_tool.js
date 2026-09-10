// Click the 工具 first-level category and report whatever second level appears.
//
// Browsing the cascade is free — only pressing 确定 consumes one of the five monthly adds — so
// this deliberately explores and reports rather than committing to a leaf it has not seen.
(() => {
  const TOOL = String.fromCharCode(24037, 20855); // 工具
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const leaves = () =>
    [...new Set(
      [...document.querySelectorAll('li,a,div,span,label')]
        .filter((e) => {
          const t = (e.innerText || '').trim();
          return vis(e) && t.length >= 2 && t.length <= 16 && e.children.length === 0
            && e.getBoundingClientRect().height < 60;
        })
        .map((e) => (e.innerText || '').trim()),
    )];

  const before = leaves();
  const target = [...document.querySelectorAll('li,a,div,span,label')]
    .filter((e) => vis(e) && (e.innerText || '').trim() === TOOL && e.children.length === 0)
    .pop();
  if (!target) return { ok: false, why: 'no 工具 cell', before };
  target.click();
  return { ok: true, clicked: TOOL, before };
})();
