// Read the category picker WITHOUT selecting anything.
//
// The page warns 本月可添加5次, so a wrong pick costs one of five monthly attempts. The target
// is a path containing 工具 — the official 虚拟支付：个人 page makes 服务类目含「工具」 a hard
// condition, so this is not a matter of taste.
(() => {
  const TOOL = String.fromCharCode(24037, 20855); // 工具
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const selects = [...document.querySelectorAll('select')].filter(vis).map((s, i) => ({
    i,
    name: s.name,
    value: s.value,
    options: [...s.options].map((o) => o.text.trim()).filter(Boolean).slice(0, 60),
  }));

  // many WeChat pickers are lists of clickable cells rather than <select>
  const cells = [...document.querySelectorAll('li,a,div,span,label')]
    .filter((e) => {
      const t = (e.innerText || '').trim();
      return vis(e) && t.length >= 2 && t.length <= 14 && e.getBoundingClientRect().height < 60 && e.children.length === 0;
    })
    .map((e) => (e.innerText || '').trim());

  const uniq = [...new Set(cells)];
  return {
    url: location.href,
    stillQr: (document.body.innerText || '').includes(String.fromCharCode(25195, 30721)), // 扫码
    selects,
    toolPresent: uniq.some((t) => t.includes(TOOL)),
    toolCells: uniq.filter((t) => t.includes(TOOL)),
    cellSample: uniq.slice(0, 40),
  };
})();
