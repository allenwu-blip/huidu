// Pull the parts of the virtual-payment API doc that decide whether an individual can use it,
// plus any link to the real access guide. The docs site is a SPA, so this runs after render.
(() => {
  const txt = document.body.innerText;
  const lines = txt.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const keyRe = /开通|主体|个人|个体|企业|资质|类目|限额|条件|申请|认证|备案|仅|支持/;
  const hits = lines.filter((l) => keyRe.test(l) && l.length > 6 && l.length < 220);

  const links = [...document.querySelectorAll('a')]
    .map((a) => ({ t: (a.innerText || '').trim(), h: a.href }))
    .filter((x) => /虚拟支付|接入|指引|开通|guide|virtual/i.test(x.t + x.h))
    .slice(0, 15);

  return { url: location.href, hitCount: hits.length, hits: hits.slice(0, 40), links };
})();
