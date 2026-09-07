#!/usr/bin/env python3
"""weread_dump.py - pull Allen's own WeRead highlights through the already-logged-in Chrome.

Transport is RAW CDP against a single page target (same trick as loc-biz/social/screenctl.py).
Playwright's connect_over_cdp attaches to every tab in the browser and hangs when a heavy tab
(Colab) is open, so it is deliberately not used here.

Nothing leaves the machine: output goes to w3/fixtures/.

  python weread_dump.py notes             global 想法 list -> which books have notes
  python weread_dump.py harvest           for every one of those books, pull 划线 + 想法
  python weread_dump.py book <bookId>     one book only
"""
import json
import sys
import time
from pathlib import Path

import requests
import websocket

CDP = "http://127.0.0.1:9333"
OUT = Path(__file__).resolve().parent.parent / "fixtures"
OUT.mkdir(parents=True, exist_ok=True)
HOME = "https://weread.qq.com/"


class Page:
    """One CDP page target, spoken to directly over its own websocket."""

    def __init__(self, ws_url):
        # suppress_origin is required: Chrome 111+ rejects CDP websockets that carry an Origin header
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

    def evaluate(self, expr):
        r = self.call("Runtime.evaluate", {"expression": expr, "awaitPromise": True, "returnByValue": True})
        if "exceptionDetails" in r:
            raise RuntimeError(str(r["exceptionDetails"])[:400])
        return r.get("result", {}).get("value")

    def close(self):
        try:
            self.ws.close()
        except Exception:  # noqa: BLE001
            pass


def page_targets():
    return [t for t in requests.get(f"{CDP}/json/list", timeout=15).json() if t.get("type") == "page"]


def attach(url_sub=".weread.qq.com", make_url=HOME):
    """Reuse a matching tab if one exists, otherwise open a NEW tab (never hijack another)."""
    for t in page_targets():
        if url_sub.lstrip(".") in t.get("url", ""):
            return Page(t["webSocketDebuggerUrl"]), False
    try:
        t = requests.put(f"{CDP}/json/new?{make_url}", timeout=20).json()
    except Exception:  # noqa: BLE001
        t = requests.get(f"{CDP}/json/new?{make_url}", timeout=20).json()
    time.sleep(3)
    for _ in range(20):
        for tt in page_targets():
            if tt.get("id") == t.get("id"):
                return Page(tt["webSocketDebuggerUrl"]), True
        time.sleep(1)
    raise SystemExit("could not attach to a weread tab")


def api(page, url):
    """fetch() from inside the page so the WeRead session cookies ride along."""
    expr = (
        "(async () => { try {"
        f"  const r = await fetch({json.dumps(url)}, {{credentials:'include', headers:{{Accept:'application/json'}}}});"
        "  const t = await r.text();"
        "  try { return {status: r.status, data: JSON.parse(t)}; }"
        "  catch (e) { return {status: r.status, raw: t.slice(0,300)}; }"
        "} catch (e) { return {__err: String(e)}; } })()"
    )
    return page.evaluate(expr)


def note_books(page):
    r = api(page, "https://weread.qq.com/web/review/list?listType=11&mine=1&synckey=0")
    if not isinstance(r, dict) or "data" not in r:
        raise SystemExit(f"review/list failed: {json.dumps(r, ensure_ascii=False)[:400]}")
    d = r["data"]
    (OUT / "review_list_raw.json").write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
    books = {}
    for it in d.get("reviews", []) or []:
        rv = it.get("review", it) or {}
        bk = rv.get("book") or {}
        if bk.get("bookId"):
            books[bk["bookId"]] = bk.get("title", "?")
    return books


def dump_book(page, book_id, title="?"):
    marks = api(page, f"https://weread.qq.com/web/book/bookmarklist?bookId={book_id}")
    revs = api(page, f"https://weread.qq.com/web/review/list?bookId={book_id}&listType=11&mine=1&synckey=0")
    md = marks.get("data") if isinstance(marks, dict) else None
    rd = revs.get("data") if isinstance(revs, dict) else None
    n_m = len((md or {}).get("updated", []) or []) if isinstance(md, dict) else 0
    n_r = len((rd or {}).get("reviews", []) or []) if isinstance(rd, dict) else 0
    if isinstance(md, dict) and (md.get("book") or {}).get("title"):
        title = md["book"]["title"]
    if n_m or n_r:
        (OUT / f"weread_{book_id}.json").write_text(
            json.dumps({"bookId": book_id, "title": title, "bookmarks": md, "reviews": rd}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return n_m, n_r, title


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "notes"
    page, opened = attach()
    print(f"attached to a weread tab ({'new tab opened' if opened else 'reused existing'})")
    try:
        if cmd == "notes":
            books = note_books(page)
            print(f"有笔记的书 {len(books)} 本：")
            for bid, t in books.items():
                print(f"  {bid:<12} {t}")
        elif cmd == "book":
            n_m, n_r, t = dump_book(page, sys.argv[2])
            print(f"{sys.argv[2]}  {t}  划线 {n_m}  想法 {n_r}")
        elif cmd == "harvest":
            books = note_books(page)
            print(f"从想法列表得到 {len(books)} 本书，逐本拉划线\n")
            tot_m = tot_r = 0
            for bid, t in books.items():
                try:
                    n_m, n_r, t2 = dump_book(page, bid, t)
                    tot_m += n_m
                    tot_r += n_r
                    print(f"  {bid:<12} 划线 {n_m:>4}  想法 {n_r:>4}   {t2[:36]}")
                except Exception as e:  # noqa: BLE001
                    print(f"  {bid:<12} 失败 {str(e)[:80]}")
                time.sleep(0.35)
            print(f"\n合计：划线 {tot_m} 条，想法 {tot_r} 条，覆盖 {len(books)} 本书")
            print("文件在", OUT)
        else:
            sys.exit("unknown cmd")
    finally:
        page.close()


if __name__ == "__main__":
    main()
