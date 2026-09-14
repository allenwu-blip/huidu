// Select 类目=其他 and 主体类型=个人, then report the resulting state WITHOUT pressing 继续.
//
// Why these two: 回甘 is a tool, not a game, and the detailed 服务类目 (which must contain
// 工具 for 虚拟支付) is set later in the MP console. 主体类型 must be 个人 because the official
// 虚拟支付：个人 page requires 个人主体 holding a mainland ID — picking 企业 here would need a
// business licence he does not have.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  // 类目: hidden radios behind visible labels
  const other = document.querySelector('label[for="checkbox2"]');
  if (!other) return { ok: false, why: 'label for checkbox2 (其他) not found' };
  if ((other.innerText || '').trim() !== '其他') {
    return { ok: false, why: 'checkbox2 is not 其他; refusing to guess', saw: (other.innerText || '').trim() };
  }
  other.click();

  // 主体类型: find the clickable whose whole text is 个人 — 个人 must not match 其他组织 etc.
  const cands = [...document.querySelectorAll('label,a,button,span,div,li')]
    .filter((e) => vis(e) && (e.innerText || '').trim() === '个人' && e.getBoundingClientRect().height < 70);
  if (!cands.length) {
    return {
      ok: false,
      why: 'no element whose text is exactly 个人',
      nearby: [...document.querySelectorAll('label,a,button,span,div,li')]
        .filter((e) => vis(e) && /个人|企业|政府|媒体|组织/.test(e.innerText || '') && (e.innerText || '').trim().length < 12)
        .map((e) => (e.innerText || '').trim()).slice(0, 12),
    };
  }
  cands[cands.length - 1].click();

  const cat = document.querySelector('input[name=category_type]');
  const region = document.querySelector('#js_region_input');
  const r1 = document.querySelector('#checkbox1');
  const r2 = document.querySelector('#checkbox2');
  return {
    ok: true,
    categoryGame: r1 ? r1.checked : null,
    categoryOther: r2 ? r2.checked : null,
    categoryTypeValue: cat ? cat.value : null,
    region: region ? region.value : null,
    bodyMentionsSelected: (document.body.innerText || '').includes('个人'),
  };
})();
