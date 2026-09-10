// Choose 小程序 on the account-type page. Clicks the card whose heading is exactly 小程序 so
// it cannot land on 公众号 or 服务号 — picking the wrong type would mean registering an account
// that can never host this product and cannot be converted afterwards.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const all = [...document.querySelectorAll('a,button,div,li,label')].filter(vis);
  const heads = all.filter((e) => (e.innerText || '').trim() === '小程序');
  if (!heads.length) {
    return {
      ok: false,
      why: 'no element whose text is exactly 小程序',
      seen: [...new Set(all.map((e) => (e.innerText || '').trim()).filter((t) => t && t.length < 20))].slice(0, 20),
    };
  }
  // walk up to the clickable card that contains the heading
  let node = heads[heads.length - 1];
  for (let i = 0; i < 5 && node; i++) {
    const link = node.tagName === 'A' ? node : node.querySelector && node.querySelector('a');
    if (link && vis(link)) {
      link.click();
      return { ok: true, via: 'anchor', href: link.getAttribute('href') };
    }
    node = node.parentElement;
  }
  heads[heads.length - 1].click();
  return { ok: true, via: 'text click' };
})();
