// Fill the registration email and ask WeChat to send the activation code.
//
// Only this one step is automated on purpose. The code is short-lived, and the next screen
// needs an ID card and a face scan that nobody can automate anyway — so building a fragile
// UIA reader to save twenty seconds of reading six digits would be a bad trade.
(() => {
  const EMAIL = 'AllenWu06@outlook.com';

  const setNative = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (d && d.set) d.set.call(el, v);
    else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  const email = document.querySelector('#js_email, input[name=email]');
  if (!email) return { ok: false, why: 'email field not found' };
  email.focus();
  setNative(email, EMAIL);

  const vis = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
  };
  const btn = [...document.querySelectorAll('a,button')]
    .filter(vis)
    .find((b) => /激活邮箱|获取验证码|发送验证码/.test((b.innerText || '').trim()));
  if (!btn) {
    return {
      ok: false,
      why: 'no send-code button',
      filled: email.value,
      saw: [...document.querySelectorAll('a,button')].filter(vis).map((b) => (b.innerText || '').trim()).filter(Boolean).slice(0, 20),
    };
  }
  btn.click();
  return { ok: true, filled: email.value, clicked: (btn.innerText || '').trim() };
})();
