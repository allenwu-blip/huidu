// Press 继续 only if the three permanent choices still read correctly. The category cannot be
// changed to 游戏 after registration and 主体类型 decides whether 虚拟支付：个人 is available at
// all, so this refuses rather than proceeds on a surprise.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const other = document.querySelector('#checkbox2');
  const game = document.querySelector('#checkbox1');
  if (!other || !other.checked) return { ok: false, why: '类目 其他 is not checked' };
  if (game && game.checked) return { ok: false, why: '类目 游戏 is checked — wrong and permanent' };

  const person = [...document.querySelectorAll('.js_btn_contractor_type')]
    .find((e) => (e.innerText || '').trim() === '个人');
  if (!person || !/selected/.test((person.className || '').toString())) {
    return { ok: false, why: '主体类型 个人 is not selected' };
  }

  const region = document.querySelector('#js_region_input');
  if (!region || region.value !== '中国大陆') {
    return { ok: false, why: 'region is not 中国大陆', saw: region ? region.value : null };
  }

  const btn = [...document.querySelectorAll('a,button')].filter(vis)
    .find((b) => (b.innerText || '').trim() === '继续');
  if (!btn) return { ok: false, why: 'no 继续 button' };
  btn.click();
  return { ok: true, confirmed: { category: '其他', entity: '个人', region: region.value } };
})();
