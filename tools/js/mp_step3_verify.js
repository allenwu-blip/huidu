// Dismiss the "类目不可改" confirmation, then report what is actually selected.
// The dialog warns the category is permanent after registration, so the state is read back
// from the controls rather than assumed from the clicks that were issued.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };

  const ok = [...document.querySelectorAll('a,button')].filter(vis)
    .find((b) => /^(我知道了|确定|知道了)$/.test((b.innerText || '').trim()));
  if (ok) ok.click();

  const r1 = document.querySelector('#checkbox1');
  const r2 = document.querySelector('#checkbox2');

  // 主体类型 renders as a row of pills; report every one with whether it looks active,
  // judged by class name rather than by colour.
  const pills = [...document.querySelectorAll('label,a,li,div,span)'.replace(')', ''))]
    .filter((e) => vis(e) && ['个人', '企业', '政府', '媒体', '其他组织'].includes((e.innerText || '').trim())
      && e.getBoundingClientRect().height < 70)
    .map((e) => ({
      text: (e.innerText || '').trim(),
      cls: (e.className || '').toString().slice(0, 60),
      active: /select|active|checked|current|on\b/i.test((e.className || '').toString()),
    }));

  const radios = [...document.querySelectorAll('input[type=radio]')].map((r) => ({
    id: r.id, name: r.name, value: r.value, checked: r.checked,
  }));

  return {
    dialogDismissed: !!ok,
    categoryGame: r1 ? r1.checked : null,
    categoryOther: r2 ? r2.checked : null,
    entityPills: pills,
    radios,
    continueEnabled: (() => {
      const b = [...document.querySelectorAll('a,button')].filter(vis)
        .find((x) => (x.innerText || '').trim() === '继续');
      return b ? !b.disabled : null;
    })(),
  };
})();
