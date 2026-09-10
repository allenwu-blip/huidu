// Locate the 备案 entry. The official guide says it appears either as a banner on the home
// page or under 设置 → 小程序备案, and that unlisted (未上架) mini programs have been able to
// file since 2023-09-04 — so a brand-new account should still find it.
//
// Chinese literals are built from char codes: this file is read by web.py and passed over CDP,
// which is fine, but keeping the pattern consistent with the PowerShell side avoids surprises.
(() => {
  const BEIAN = String.fromCharCode(22791, 26696); // 备案
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const txt = document.body.innerText || '';
  const mentions = txt
    .split('\n')
    .map((s) => s.trim())
    .filter((l) => l.includes(BEIAN) && l.length < 160);

  const clickables = [...document.querySelectorAll('a,button,div,span,li')]
    .filter((e) => vis(e) && (e.innerText || '').includes(BEIAN) && (e.innerText || '').trim().length < 24)
    .map((e) => ({
      text: (e.innerText || '').trim(),
      tag: e.tagName.toLowerCase(),
      href: e.closest('a') ? e.closest('a').getAttribute('href') : null,
    }));

  // also list the top-level sidebar entries so 设置 can be found if 备案 is nested
  const sidebar = [...document.querySelectorAll('a,li,div')]
    .filter((e) => vis(e) && (e.innerText || '').trim().length >= 2 && (e.innerText || '').trim().length <= 6
      && e.getBoundingClientRect().left < 300 && e.getBoundingClientRect().height < 60)
    .map((e) => (e.innerText || '').trim());

  return {
    url: location.href,
    mentions: mentions.slice(0, 10),
    clickables: clickables.slice(0, 10),
    sidebar: [...new Set(sidebar)].slice(0, 26),
  };
})();
