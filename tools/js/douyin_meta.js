// Douyin's player needs a login and heavy JS, but the video's own caption is usually present
// in <title>, og: meta tags, or a description node. Pull those rather than fighting the player.
(() => {
  const metas = {};
  for (const m of document.querySelectorAll('meta')) {
    const k = m.getAttribute('property') || m.getAttribute('name');
    const v = m.getAttribute('content');
    if (k && v && v.length > 4 && /title|desc|keyword|og:|video/i.test(k)) metas[k] = v.slice(0, 400);
  }
  const descNodes = [...document.querySelectorAll('h1,[class*=desc],[class*=title],[data-e2e]')]
    .map((e) => (e.innerText || '').trim())
    .filter((t) => t.length > 8 && t.length < 300);
  const loginWall = /登录|扫码|打开抖音|下载抖音/.test(document.body.innerText) ;
  return {
    title: document.title,
    metas,
    descNodes: [...new Set(descNodes)].slice(0, 10),
    videoTags: document.querySelectorAll('video').length,
    looksLikeLoginWall: loginWall,
  };
})();
