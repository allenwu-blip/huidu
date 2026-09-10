// Pull the real download links off the DevTools download page. The page is a SPA, so WebFetch
// only ever sees the shell; this runs after render. URL guessing has 404'd twice on this docs
// site already, so the links are read rather than constructed.
(() => {
  const links = [...document.querySelectorAll('a')]
    .map((a) => ({ text: (a.innerText || '').trim().slice(0, 40), href: a.href }))
    .filter((x) => /download_redirect|\.exe|\.dmg|servicewechat/i.test(x.href));

  const txt = document.body.innerText || '';
  const versions = txt
    .split('\n')
    .map((s) => s.trim())
    .filter((l) => /稳定|Stable|版本|\d+\.\d+\.\d+/.test(l) && l.length < 90);

  return {
    url: location.href,
    links: links.slice(0, 14),
    versionLines: [...new Set(versions)].slice(0, 12),
  };
})();
