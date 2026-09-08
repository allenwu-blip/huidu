#!/usr/bin/env python3
"""gh_deploy.py - drive the logged-in GitHub tab through repo creation and Pages setup.

Raw CDP against a single tab, same transport as weread_dump.py: Playwright's connect_over_cdp
attaches to every tab and hangs on heavy ones. All JS lives here as Python strings so PowerShell
never sees a quote — the command line mangles inner quotes and `$`.

  python gh_deploy.py inspect     dump the form fields on whatever GitHub page is open
  python gh_deploy.py create      fill in the new-repository form and submit
  python gh_deploy.py pages       set Pages source to main /docs
"""
import json
import sys
import time
from pathlib import Path

import requests
import websocket

CDP = "http://127.0.0.1:9333"
REPO = "huidu"
DESC = "把你在微信读书里划过的线，每天推几条回来给你看。纯前端，数据只存在你自己的浏览器里。"


class Page:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=90, suppress_origin=True)
        self._id = 0

    def call(self, method, params=None):
        self._id += 1
        mid = self._id
        self.ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == mid:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def ev(self, expr):
        r = self.call(
            "Runtime.evaluate",
            {"expression": expr, "awaitPromise": True, "returnByValue": True, "userGesture": True},
        )
        if "exceptionDetails" in r:
            raise RuntimeError(str(r["exceptionDetails"])[:400])
        return r.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:  # noqa: BLE001
            pass


def attach(sub="github.com"):
    for t in requests.get(f"{CDP}/json/list", timeout=15).json():
        if t.get("type") == "page" and sub in t.get("url", ""):
            return Page(t["webSocketDebuggerUrl"])
    raise SystemExit(f"no tab matching {sub}; open it first")


def goto(p, url, wait=5):
    """Navigate over raw CDP.

    Deliberately not cdp.py: that uses Playwright's connect_over_cdp, which attaches to every
    tab in the browser and times out whenever a heavy one (TikTok, Colab) is open. It failed
    silently mid-sequence once and left the next step operating on the wrong page.
    """
    p.call("Page.navigate", {"url": url})
    for _ in range(wait * 2):
        time.sleep(0.5)
        try:
            if p.ev("document.readyState") == "complete" and url.split("://")[1].split("/")[1] in p.ev("location.href"):
                break
        except Exception:  # noqa: BLE001
            pass
    time.sleep(1.5)
    return p.ev("location.href")


INSPECT = """
(() => {
  const out = {url: location.href, title: document.title};
  out.inputs = [...document.querySelectorAll('input')].map((e, i) =>
    ({i, type: e.type, name: e.name, id: e.id, value: (e.value||'').slice(0,40),
      checked: e.checked, aria: e.getAttribute('aria-label')||''}));
  out.buttons = [...document.querySelectorAll('button,summary,[role=button]')]
    .map((e,i)=>({i, text:(e.innerText||'').trim().slice(0,40), type:e.type||'',
                  aria:e.getAttribute('aria-label')||''}))
    .filter(b=>b.text||b.aria);
  return out;
})()
"""


def cmd_inspect(p):
    d = p.ev(INSPECT)
    print(d["url"], "|", d["title"])
    print("\n-- inputs --")
    for e in d["inputs"]:
        print(f"  [{e['i']:>2}] type={e['type']:<10} name={e['name']:<22} id={e['id']:<24} "
              f"checked={e['checked']} value={e['value']!r} aria={e['aria'][:40]!r}")
    print("\n-- buttons --")
    for b in d["buttons"][:45]:
        print(f"  [{b['i']:>2}] {b['text'][:38]!r:<42} aria={b['aria'][:36]!r}")


# Selectors confirmed by `probe` against the live page on 2026-09-07: the name field is
# #repository-name-input (hyphens), the description is input[name=Description], and visibility
# is an ActionMenu button that already reads "Public" by default — there are no radio inputs.
CREATE = """
(() => {
  const R = %s, D = %s;
  const log = [];
  const setNative = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    d.set.call(el, v);
    el.dispatchEvent(new Event('input', {bubbles:true}));
    el.dispatchEvent(new Event('change', {bubbles:true}));
  };

  const name = document.querySelector('#repository-name-input');
  if (!name) return {ok:false, why:'#repository-name-input not found'};
  setNative(name, R);
  log.push('name=' + name.value);

  const desc = document.querySelector('input[name="Description"]');
  if (desc) { setNative(desc, D); log.push('desc=' + desc.value.slice(0,20)); }
  else log.push('no description field');

  const vis = [...document.querySelectorAll('button')]
    .find(b => /^(Public|Private)$/.test((b.innerText||'').trim()));
  log.push('visibility=' + (vis ? vis.innerText.trim() : 'unknown'));
  if (vis && vis.innerText.trim() !== 'Public') {
    return {ok:false, why:'visibility is not Public; refusing to create a private repo silently'};
  }
  return {ok:true, log, name:name.value};
})()
""" % (json.dumps(REPO), json.dumps(DESC))


SUBMIT = """
(() => {
  const b = [...document.querySelectorAll('button')].find(x =>
    /create repository/i.test((x.innerText||'').trim()) && !x.disabled);
  if (!b) {
    const all = [...document.querySelectorAll('button')]
      .map(x=>({t:(x.innerText||'').trim().slice(0,30), dis:x.disabled}))
      .filter(x=>x.t);
    return {ok:false, buttons:all.slice(0,30)};
  }
  b.scrollIntoView({block:'center'});
  b.click();
  return {ok:true};
})()
"""


PROBE = """
(() => {
  const out = {};
  // Only report errors the user can actually SEE. GitHub keeps hidden error templates in the
  // DOM, and treating those as real sent me chasing a stale-token bug that did not exist.
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && e.offsetParent !== null;
  };
  const nodes = [...document.querySelectorAll('[role=alert],.flash-error,.color-fg-danger,[class*=error]')];
  out.errorsVisible = [...new Set(nodes.filter(visible).map(e => (e.innerText||'').trim()).filter(t => t && t.length < 300))].slice(0, 6);
  out.errorsHiddenCount = nodes.length - nodes.filter(visible).length;
  const nameEl = document.querySelector('#repository-name-input');
  out.name = nameEl ? nameEl.value : null;
  out.nameValid = nameEl ? nameEl.getAttribute('aria-invalid') : null;
  const vis = [...document.querySelectorAll('button')].find(b => /^(Public|Private)$/.test((b.innerText||'').trim()));
  if (vis) {
    out.visibilityButton = (vis.innerText||'').trim();
    out.visibilityExpanded = vis.getAttribute('aria-expanded');
    out.visibilityHtml = vis.outerHTML.slice(0, 300);
  }
  out.radios = [...document.querySelectorAll('input[type=radio]')]
    .map(r => ({name: r.name, value: r.value, checked: r.checked, id: r.id}));
  const create = [...document.querySelectorAll('button')].find(b => /create repository/i.test(b.innerText||''));
  out.createDisabled = create ? create.disabled : 'not found';
  return out;
})()
"""


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "inspect"
    p = attach()
    try:
        if cmd == "pages":
            print("on:", goto(p, f"https://github.com/allenwu-blip/{REPO}/settings/pages", wait=8))

            # These are ActionMenu buttons, not <select>: open the menu, then click the item.
            def click_text(pattern, why):
                js = """
                (() => {
                  const re = %s;
                  const els = [...document.querySelectorAll('button,[role=menuitem],[role=option],a')];
                  const hit = els.find(e => { const t=(e.innerText||'').trim(); return re.test(t); });
                  if (!hit) return {ok:false, saw: els.map(e=>(e.innerText||'').trim()).filter(Boolean).slice(0,25)};
                  hit.scrollIntoView({block:'center'});
                  hit.click();
                  return {ok:true, clicked:(hit.innerText||'').trim().slice(0,40)};
                })()
                """ % pattern
                r = p.ev(js)
                print(f"  {why}: {json.dumps(r, ensure_ascii=False)[:220]}")
                time.sleep(1.5)
                return r

            state = lambda: p.ev(
                "(()=>{const b=[...document.querySelectorAll('button')].map(x=>(x.innerText||'').trim());"
                "return {branch:b.find(t=>t==='main'||t==='None')||'?', all:b.filter(t=>t==='main'||t==='None'||t.startsWith('/'))}})()"
            )

            click_text("/^None$/", "open branch menu")
            click_text("/^main$/", "pick main")
            print("  after branch:", json.dumps(state(), ensure_ascii=False))
            click_text(r"/^\/ \(root\)$/", "open folder menu")
            click_text(r"/^\/docs$/", "pick /docs")
            print("  after folder:", json.dumps(state(), ensure_ascii=False))
            click_text("/^Save$/", "save")
            time.sleep(5)
            print("page text now:", p.ev("document.body.innerText.slice(0,600).replace(/\\n{2,}/g,'\\n')")[-400:])
        elif cmd == "pagesinspect":
            print("on:", goto(p, f"https://github.com/allenwu-blip/{REPO}/settings/pages", wait=8))
            js = """
            (() => ({
              selects: [...document.querySelectorAll('select')].map((s,i) => ({
                i, id: s.id, name: s.name, value: s.value,
                options: [...s.options].map(o => o.value + '|' + o.text.trim()).slice(0,12)
              })),
              buttons: [...document.querySelectorAll('button')]
                .map(b => (b.innerText||'').trim()).filter(Boolean).slice(0,25),
              text: document.body.innerText.replace(/\\n{2,}/g,'\\n').slice(0, 900)
            }))()
            """
            print(json.dumps(p.ev(js), ensure_ascii=False, indent=2))
        elif cmd == "forms":
            js = """
            (() => document.querySelectorAll('form').length
              ? [...document.querySelectorAll('form')].map((f,i) => ({
                  i, action: f.getAttribute('action'), method: f.getAttribute('method'),
                  hidden: [...f.querySelectorAll('input[type=hidden]')].map(h => h.name + '=' + h.value).slice(0,4),
                  controls: [...f.querySelectorAll('button,input[type=submit],a')]
                    .map(b => ((b.innerText||b.value||'').trim() || b.getAttribute('aria-label') || '').slice(0,30))
                    .filter(Boolean).slice(0,6)
                }))
              : 'no forms')()
            """
            print(json.dumps(p.ev(js), ensure_ascii=False, indent=2))
        elif cmd == "delkeys":
            # GitHub cannot toggle write access after creation, and it refuses a duplicate key,
            # so a read-only key has to be removed before the writable one can be added.
            # The real form action is /<owner>/<repo>/deploy_keys/<id> (not /settings/keys/<id>),
            # and its Delete button lives OUTSIDE the form via the `form` attribute, so there is
            # nothing to click inside it. Submitting the form directly carries the hidden
            # _method=delete and authenticity_token, which is all the server needs.
            js = """
            (() => {
              const f = [...document.querySelectorAll('form')].find(x =>
                /\\/deploy_keys\\/\\d+$/.test(x.getAttribute('action')||''));
              if (!f) return {ok:false, why:'no deploy_keys delete form on this page'};
              const method = f.querySelector('input[name=_method]');
              if (!method || method.value !== 'delete') return {ok:false, why:'form is not a delete'};
              const action = f.getAttribute('action');
              f.submit();
              return {ok:true, submitted: action};
            })()
            """
            print("delete:", json.dumps(p.ev(js), ensure_ascii=False))
            time.sleep(3)
            print("now at:", p.ev("location.href"))
            print("keys left:", p.ev("(()=>{const t=document.body.innerText;return (t.match(/huidu deploy/g)||[]).length})()"))
        elif cmd == "deploykey":
            landed = goto(p, f"https://github.com/allenwu-blip/{REPO}/settings/keys/new")
            print("on:", landed)
            if "/keys/new" not in landed:
                raise SystemExit("did not reach the add-key page; is the session still logged in?")
            pub = (Path.home() / ".ssh" / "id_ed25519_huidu.pub").read_text(encoding="utf-8").strip()
            js = """
            (() => {
              const KEY = %s, TITLE = %s;
              const setNative = (el, v) => {
                const d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
                d.set.call(el, v);
                el.dispatchEvent(new Event('input', {bubbles:true}));
                el.dispatchEvent(new Event('change', {bubbles:true}));
              };
              const title = document.querySelector('#public_key_title, input[name="public_key[title]"]');
              const body  = document.querySelector('#public_key_key, textarea[name="public_key[key]"]');
              if (!title || !body) return {ok:false, why:'deploy key form not found', url:location.href};
              setNative(title, TITLE);
              setNative(body, KEY);
              // Confirmed against the live form: the control is a checkbox with id `read_only`
              // whose value is "0", paired with a hidden "1". Ticking it means read_only=0,
              // i.e. WRITE ACCESS. The name reads backwards from what it does.
              const rw = document.querySelector('#read_only');
              if (!rw) return {ok:false, why:'write-access checkbox #read_only not found'};
              if (!rw.checked) rw.click();
              if (!rw.checked) return {ok:false, why:'could not tick the write-access checkbox'};
              return {ok:true, title:title.value, keyLen:body.value.length, writeAccess:true};
            })()
            """ % (json.dumps(pub), json.dumps("huidu deploy (Claude Code)"))
            print("fill:", json.dumps(p.ev(js), ensure_ascii=False))
            time.sleep(1)
            sub = """
            (() => {
              const b = [...document.querySelectorAll('button,input[type=submit]')]
                .find(x => /add key/i.test((x.innerText||x.value||'').trim()));
              if (!b) return {ok:false};
              b.click(); return {ok:true};
            })()
            """
            print("submit:", json.dumps(p.ev(sub), ensure_ascii=False))
            time.sleep(3)
            print("now at:", p.ev("location.href"))
        elif cmd == "probe":
            print(json.dumps(p.ev(PROBE), ensure_ascii=False, indent=2))
        elif cmd == "inspect":
            cmd_inspect(p)
        elif cmd == "create":
            print("fill:", json.dumps(p.ev(CREATE), ensure_ascii=False))
            time.sleep(1.5)
            print("submit:", json.dumps(p.ev(SUBMIT), ensure_ascii=False))
            for _ in range(15):
                time.sleep(2)
                u = p.ev("location.href")
                if "/new" not in u:
                    print("landed on:", u)
                    break
            else:
                print("still on the form:", p.ev("location.href"))
                err = p.ev("(()=>{const e=document.querySelector('.flash-error,[role=alert]');return e?e.innerText.trim().slice(0,200):''})()")
                if err:
                    print("page error:", err)
        else:
            sys.exit("unknown cmd")
    finally:
        p.close()


if __name__ == "__main__":
    main()
