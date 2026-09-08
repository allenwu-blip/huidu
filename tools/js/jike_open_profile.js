// Open Allen's own profile via the sidebar person icon. The composer clearing is strong
// evidence the post went out, but the post appearing on his own page is proof.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  // sidebar items sit in a narrow column on the far left
  const items = [...document.querySelectorAll('a,button,div[role="button"]')]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return vis(e) && r.left < 110 && r.width < 90 && r.height < 90 && r.height > 20;
    })
    .map((e, i) => {
      const r = e.getBoundingClientRect();
      return { i, tag: e.tagName, href: e.getAttribute('href') || '', y: Math.round(r.top), el: e };
    });
  // the person icon is the 4th nav item down (home, search, messages, profile)
  const target = items.sort((a, b) => a.y - b.y)[3];
  if (!target) return { ok: false, items: items.map(({ i, tag, href, y }) => ({ i, tag, href, y })) };
  target.el.click();
  return { ok: true, clickedY: target.y, href: target.href, list: items.map(({ tag, href, y }) => ({ tag, href, y })) };
})();
