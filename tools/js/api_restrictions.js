// Pull the parts of a WeChat API doc that say who may call it. The sidebar dominates
// innerText on this SPA, so target the content region and filter to restriction wording.
(() => {
  const main =
    document.querySelector('.markdown-body, .content, main, article') || document.body;
  const txt = (main.innerText || '').replace(/\n{2,}/g, '\n');
  const lines = txt.split('\n').map((s) => s.trim()).filter(Boolean);
  const re = /主体|个人|企业|不支持|仅支持|限制|权限|需|禁止|无法|生效|基础库|PC|Windows|版本/;
  return {
    url: location.href,
    totalLines: lines.length,
    head: lines.slice(0, 12),
    restrictions: lines.filter((l) => re.test(l) && l.length > 5 && l.length < 240).slice(0, 25),
  };
})();
