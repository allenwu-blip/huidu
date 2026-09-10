// Pull the AppID off the 开发管理/开发设置 page. gh_… is the 原始ID; project.config.json needs
// the wx-prefixed AppID, which is a different string and easy to confuse.
(() => {
  const txt = document.body.innerText || '';
  const appid = (txt.match(/\bwx[0-9a-f]{16}\b/) || [])[0] || null;
  const gh = (txt.match(/\bgh_[0-9a-z]+\b/) || [])[0] || null;
  const lines = txt
    .split('\n')
    .map((s) => s.trim())
    .filter((l) => /AppID|原始|开发者|ID/i.test(l) && l.length < 90);
  return { url: location.href, appid, gh, lines: lines.slice(0, 12) };
})();
