#!/usr/bin/env python3
"""web.py - drive Allen's real logged-in Chrome over RAW CDP.

Replaces loc-biz/social/cdp.py for anything that matters. cdp.py uses Playwright's
connect_over_cdp, which attaches to EVERY tab in the browser and times out whenever a heavy one
(Colab, TikTok) is open. That failure is silent from the caller's point of view: the navigation
never happens, and the next step runs against whatever page was already there. It has bitten
this project twice.

  python web.py goto <url> [--tab <substr>]
  python web.py text [--tab <substr>] [--n 1500]     visible page text
  python web.py links [--tab <substr>]               forms/inputs/buttons summary
  python web.py js "<expr>" [--tab <substr>]         evaluate and print JSON
  python web.py shot [--tab <substr>]                screenshot to shots/

JS is passed as a file with --file to avoid PowerShell mangling inner quotes and `$`.
"""
import argparse
import base64
import json
import sys
import time
from pathlib import Path

import requests
import websocket

CDP = "http://127.0.0.1:9333"
SHOTS = Path(__file__).resolve().parent.parent / "shots"
SHOTS.mkdir(exist_ok=True)


class Page:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=120, suppress_origin=True)
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
            raise RuntimeError(str(r["exceptionDetails"])[:500])
        return r.get("result", {}).get("value")

    def goto(self, url, wait=8):
        self.call("Page.navigate", {"url": url})
        for _ in range(wait * 2):
            time.sleep(0.5)
            try:
                if self.ev("document.readyState") == "complete":
                    break
            except Exception:  # noqa: BLE001
                pass
        time.sleep(1.5)
        return self.ev("location.href")

    def insert_text(self, text):
        """Type into whatever has focus using a real browser-level input event.

        React-controlled rich text editors (即刻, Slate/ProseMirror, Monaco) ignore direct
        textContent or .value assignment — their state never updates, so the Send button stays
        disabled. Input.insertText goes through the same path as a human typing.
        """
        self.call("Input.insertText", {"text": text})

    def shot(self, name=None):
        # A backgrounded tab is not painted, so captureScreenshot returns a blank white image.
        # Bring it forward first, and give the compositor a moment to actually draw.
        try:
            self.call("Page.bringToFront")
            time.sleep(0.8)
        except Exception:  # noqa: BLE001
            pass
        r = self.call("Page.captureScreenshot", {"format": "png"})
        p = SHOTS / (name or f"{time.strftime('%Y%m%d_%H%M%S')}.png")
        p.write_bytes(base64.b64decode(r["data"]))
        return p

    def close(self):
        try:
            self.ws.close()
        except Exception:  # noqa: BLE001
            pass


def pages():
    return [t for t in requests.get(f"{CDP}/json/list", timeout=15).json() if t.get("type") == "page"]


def attach(sub=None, make=None):
    ts = pages()
    if sub:
        for t in ts:
            if sub in t.get("url", "") or sub in (t.get("title") or ""):
                return Page(t["webSocketDebuggerUrl"])
    if make:
        try:
            new = requests.put(f"{CDP}/json/new?{make}", timeout=20).json()
        except Exception:  # noqa: BLE001
            new = requests.get(f"{CDP}/json/new?{make}", timeout=20).json()
        time.sleep(3)
        for _ in range(20):
            for t in pages():
                if t.get("id") == new.get("id"):
                    return Page(t["webSocketDebuggerUrl"])
            time.sleep(1)
    if not sub and ts:
        return Page(ts[-1]["webSocketDebuggerUrl"])
    raise SystemExit(f"no tab matching {sub!r}; pass --make <url> to open one")


SUMMARY = """
(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
  const t = e => ((e.innerText||e.value||e.placeholder||'').trim()).slice(0,50);
  return {
    url: location.href, title: document.title,
    inputs: [...document.querySelectorAll('input,textarea,[contenteditable=true]')].filter(vis)
      .map((e,i)=>({i, tag:e.tagName.toLowerCase(), type:e.type||'', name:e.name||'',
                    id:e.id||'', ph:e.placeholder||'', val:(e.value||e.innerText||'').slice(0,40)})),
    buttons: [...document.querySelectorAll('button,[role=button],input[type=submit],a')].filter(vis)
      .map(e=>t(e)).filter(Boolean).slice(0,45)
  };
})()
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--tab")
    ap.add_argument("--make")
    ap.add_argument("--file", help="read the JS expression from this file")
    ap.add_argument("--n", type=int, default=1500)
    a = ap.parse_args()

    if a.cmd == "tabs":
        for i, t in enumerate(pages()):
            print(f"{i}. [{(t.get('title') or '')[:50]}] {t.get('url')}")
        return

    p = attach(a.tab, a.make or (a.arg if a.cmd == "goto" else None))
    try:
        if a.cmd == "goto":
            print(p.goto(a.arg))
            print(json.dumps(p.ev(SUMMARY), ensure_ascii=False, indent=2)[: a.n])
        elif a.cmd == "text":
            print(p.ev(f"document.body.innerText.replace(/\\n{{2,}}/g,'\\n').slice(0,{a.n})"))
        elif a.cmd == "links":
            print(json.dumps(p.ev(SUMMARY), ensure_ascii=False, indent=2))
        elif a.cmd == "js":
            expr = Path(a.file).read_text(encoding="utf-8") if a.file else a.arg
            print(json.dumps(p.ev(expr), ensure_ascii=False, indent=2))
        elif a.cmd == "type":
            # --file holds a JS expression that focuses the target and returns a truthy value;
            # arg (or --text-file) holds the literal text to type into it.
            focus_js = Path(a.file).read_text(encoding="utf-8") if a.file else "document.activeElement && true"
            focused = p.ev(focus_js)
            print("focus:", json.dumps(focused, ensure_ascii=False)[:300])
            text = Path(a.arg).read_text(encoding="utf-8") if a.arg and Path(a.arg).exists() else (a.arg or "")
            p.insert_text(text)
            time.sleep(1)
            print(json.dumps(p.ev(SUMMARY), ensure_ascii=False)[:400])
        elif a.cmd == "shot":
            print(p.shot())
        else:
            sys.exit(f"unknown cmd {a.cmd}")
    finally:
        p.close()


if __name__ == "__main__":
    main()
