// What kind of controls are 小程序类目 / 注册国家地区 / 主体类型 on the 信息登记 step?
// Probed before clicking because these three choices are not freely changeable afterwards:
// 主体类型 in particular decides whether 虚拟支付：个人 is available at all.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  return {
    url: location.href,
    inputs: [...document.querySelectorAll('input,select')].map((e) => ({
      tag: e.tagName.toLowerCase(),
      type: e.type,
      name: e.name,
      id: e.id,
      value: e.value,
      checked: e.type === 'radio' || e.type === 'checkbox' ? e.checked : undefined,
      visible: vis(e),
      options: e.tagName === 'SELECT' ? [...e.options].map((o) => o.value + '|' + o.text).slice(0, 8) : undefined,
    })),
    labels: [...document.querySelectorAll('label')].filter(vis).map((l) => ({
      text: (l.innerText || '').trim().slice(0, 20),
      forId: l.getAttribute('for') || '',
    })).slice(0, 20),
    clickable: [...document.querySelectorAll('a,button,span,div')]
      .filter((e) => vis(e) && ['游戏', '其他', '个人', '企业', '政府', '媒体', '其他组织', '继续'].includes((e.innerText || '').trim()))
      .map((e) => ({
        text: (e.innerText || '').trim(),
        tag: e.tagName.toLowerCase(),
        cls: (e.className || '').toString().slice(0, 40),
        x: Math.round(e.getBoundingClientRect().left),
        y: Math.round(e.getBoundingClientRect().top),
      })),
  };
})();
