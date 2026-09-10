// Open the 添加类目 picker and report the first-level options available to this 个人 account.
//
// Deliberately opens and reads without selecting: the page states 本月可添加5次, so a wrong
// pick burns one of five monthly attempts. 工具 is not optional here — the official
// 虚拟支付：个人 page lists 服务类目含「工具」 as a hard condition.
(() => {
  const ADD = String.fromCharCode(28155, 21152, 31867, 30446); // 添加类目
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const btn = [...document.querySelectorAll('a,button')]
    .filter(vis)
    .find((b) => (b.innerText || '').trim() === ADD);
  if (!btn) {
    return {
      ok: false,
      why: 'no 添加类目 button',
      buttons: [...document.querySelectorAll('a,button')].filter(vis).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 20),
    };
  }
  btn.click();
  return { ok: true, note: 'picker opened; read options in a second call once it renders' };
})();
