// Full picture of the mini program registration form before anything is typed into it:
// every visible field, checkbox, captcha and button, plus any notice about who may register.
(() => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const fields = [...document.querySelectorAll('input,select,textarea')].map((e) => ({
    tag: e.tagName.toLowerCase(),
    type: e.type,
    name: e.name,
    id: e.id,
    checked: e.type === 'checkbox' ? e.checked : undefined,
    visible: vis(e),
  }));
  const clickables = [...document.querySelectorAll('a,button')]
    .filter(vis)
    .map((e) => (e.innerText || '').trim())
    .filter(Boolean);
  const txt = (document.body.innerText || '').replace(/\n{2,}/g, '\n');
  const notices = txt
    .split('\n')
    .map((s) => s.trim())
    .filter((l) => /邮箱|未注册|已注册|绑定|个人|主体|验证码|协议|同意|每个/.test(l) && l.length > 6 && l.length < 200);
  return { url: location.href, fields, clickables: clickables.slice(0, 20), notices: notices.slice(0, 14) };
})();
