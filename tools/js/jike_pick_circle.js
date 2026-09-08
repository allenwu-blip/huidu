// Click the 个人的产品 suggestion chip and confirm it actually became the selected circle.
// Typing into the box is not selecting: the placeholder stays 未选择圈子 until a chip is clicked,
// and a post sent in that state goes out with no circle and reaches almost nobody.
(() => {
  // 读书会 over the product circles: the reader who highlights is the audience, not the maker.
  // 墨水屏爱好者俱乐部 is the other strong one — save it for when Kindle import ships.
  const WANT = '读书会';
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const all = [...document.querySelectorAll('div,span,li,button,a')].filter(vis);
  // the chip is a small element whose whole text is exactly the circle name
  const chips = all.filter((e) => (e.innerText || '').trim() === WANT && e.getBoundingClientRect().height < 60);
  if (!chips.length) {
    return {
      ok: false,
      why: 'no chip with that exact text',
      nearby: all.filter((e) => /圈子|产品/.test(e.innerText || '') && (e.innerText || '').length < 20)
        .map((e) => (e.innerText || '').trim()).slice(0, 12),
    };
  }
  // innermost match, so the click lands on the chip and not a wrapper
  const chip = chips[chips.length - 1];
  chip.click();
  return { ok: true, clicked: (chip.innerText || '').trim() };
})();
