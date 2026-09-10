// Map the 发布流程 page: which action links exist, and where 类目 and 备案 actually point.
// 类目 comes first — 服务类目 must contain 工具 before 虚拟支付 can ever be opened — so the
// order these are tackled in matters, not just that they exist.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const CAT = String.fromCharCode(31867, 30446); // 类目
  const BEIAN = String.fromCharCode(22791, 26696); // 备案
  const CERT = String.fromCharCode(35748, 35777); // 认证

  const cards = [...document.querySelectorAll('div,section,li')]
    .filter((e) => {
      const t = (e.innerText || '').trim();
      return vis(e) && t.length > 4 && t.length < 90 && (t.includes(CAT) || t.includes(BEIAN) || t.includes(CERT));
    })
    .map((e) => {
      const acts = [...e.querySelectorAll('a,button')].filter(vis).map((a) => ({
        text: (a.innerText || '').trim(),
        href: a.getAttribute('href'),
      }));
      return { text: (e.innerText || '').replace(/\n+/g, ' | ').trim().slice(0, 80), acts };
    })
    .filter((c) => c.acts.length);

  return { url: location.href, cards: cards.slice(0, 10) };
})();
