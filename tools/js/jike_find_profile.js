// Find the link to Allen's own 即刻 profile so the post can be verified where it actually
// lives. The composer clearing is suggestive but not proof that the post went through.
(() => {
  const links = [...document.querySelectorAll('a')]
    .map((a) => a.getAttribute('href') || '')
    .filter((h) => /^\/u\/|profile|\/user\//.test(h));
  return {
    profileHrefs: [...new Set(links)].slice(0, 8),
    sidebarHrefs: [...new Set([...document.querySelectorAll('nav a, aside a')].map((a) => a.getAttribute('href') || ''))].slice(0, 12),
  };
})();
