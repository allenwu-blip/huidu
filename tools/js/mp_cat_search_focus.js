// Focus the 服务类目 search box inside the 添加类目 dialog so Input.insertText can type into it.
// The box is a combobox with placeholder 请选择或者输入关键词搜索; clicking it is what opens the
// option list, so both the click and the focus matter.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const KEY = String.fromCharCode(20851, 38190, 35789); // 关键词
  const box = [...document.querySelectorAll('input,[contenteditable="true"]')]
    .filter(vis)
    .find((e) => ((e.placeholder || '') + (e.getAttribute('data-placeholder') || '')).includes(KEY));
  if (!box) {
    return {
      ok: false,
      why: 'search box not found',
      inputs: [...document.querySelectorAll('input')].filter(vis).map((e) => e.placeholder || '(no placeholder)'),
    };
  }
  box.click();
  box.focus();
  return { ok: true, placeholder: box.placeholder, active: document.activeElement === box };
})();
