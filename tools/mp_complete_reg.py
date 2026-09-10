#!/usr/bin/env python3
"""mp_complete_reg.py - finish the WeChat mini program registration form.

The password is read from loc-biz/secrets/wechat-mp.txt at runtime and injected straight into
the page. It is never written into tools/js/ (that directory is inside the public repo), never
echoed, and never passed on the command line where it would land in shell history.

  python mp_complete_reg.py <6-digit-code>
  python mp_complete_reg.py <6-digit-code> --submit    # actually click 注册
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web import attach  # noqa: E402  reuse the raw-CDP transport

SECRETS = Path(r"C:\Users\Allen\loc-biz\secrets\wechat-mp.txt")
EMAIL = "AllenWu06@outlook.com"


def read_password():
    if not SECRETS.exists():
        raise SystemExit(f"missing {SECRETS}")
    for line in SECRETS.read_text(encoding="utf-8").splitlines():
        if line.startswith("登录密码:"):
            pw = line.split(":", 1)[1].strip()
            if len(pw) < 8:
                raise SystemExit("stored password is shorter than WeChat's 8-char minimum")
            return pw
    raise SystemExit("no 登录密码 line in the secrets file")


FILL = """
(() => {
  const EMAIL = %s, CODE = %s, PW = %s;
  const setNative = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    if (d && d.set) d.set.call(el, v); else el.value = v;
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
    el.dispatchEvent(new Event('blur', {bubbles:true}));
  };
  const q = (s) => document.querySelector(s);
  const email = q('#js_email, input[name=email]');
  const code  = q('#js_email_verifycode, input[name=ticket]');
  const pw1   = q('#pw1, input[name=pw1]');
  const pw2   = q('#pw2, input[name=pw2]');
  if (!email || !code || !pw1 || !pw2) return {ok:false, why:'a field is missing'};

  if (email.value.trim() !== EMAIL) setNative(email, EMAIL);
  setNative(code, CODE);
  setNative(pw1, PW);
  setNative(pw2, PW);

  // The agree box is visually hidden behind a styled label, so click the label if there is one.
  const agree = q('#js_agree, input[name=agree]');
  let agreed = null;
  if (agree) {
    if (!agree.checked) {
      const lab = document.querySelector('label[for="' + agree.id + '"]') || agree.closest('label');
      if (lab) lab.click();
      if (!agree.checked) { agree.checked = true; agree.dispatchEvent(new Event('change', {bubbles:true})); }
    }
    agreed = agree.checked;
  }

  return {
    ok: true,
    email: email.value,
    codeLen: code.value.length,
    pwFilled: pw1.value.length > 0 && pw1.value === pw2.value,
    pwLen: pw1.value.length,
    agreed,
  };
})()
"""


SUBMIT = """
(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
  const b = [...document.querySelectorAll('a,button,input[type=submit]')].filter(vis)
    .find(x => (x.innerText || x.value || '').trim() === '注册');
  if (!b) return {ok:false, why:'no 注册 button'};
  if (b.disabled) return {ok:false, why:'注册 is disabled'};
  b.click();
  return {ok:true};
})()
"""


def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"\d{6}", sys.argv[1]):
        raise SystemExit("usage: python mp_complete_reg.py <6-digit-code> [--submit]")
    code = sys.argv[1]
    do_submit = "--submit" in sys.argv

    pw = read_password()
    p = attach("waregister")
    try:
        js = FILL % (json.dumps(EMAIL), json.dumps(code), json.dumps(pw))
        res = p.ev(js)
        # deliberately does not print the password, only whether the two fields agree
        print("fill:", json.dumps(res, ensure_ascii=False))
        if not res.get("ok") or not res.get("pwFilled"):
            raise SystemExit("form not ready; not submitting")
        if do_submit:
            import time

            time.sleep(1)
            print("submit:", json.dumps(p.ev(SUBMIT), ensure_ascii=False))
            time.sleep(5)
            print("now at:", p.ev("location.href"))
        else:
            print("filled only. re-run with --submit to click 注册.")
    finally:
        p.close()


if __name__ == "__main__":
    main()
