#!/usr/bin/env python3
"""test_bookmarklet.py - run the built bookmarklet inside the real logged-in weread tab.

This is the only way to know it works: the bookmarklet touches a live session, a live API and
the browser's download path, none of which a unit test can stand in for.

  python test_bookmarklet.py
"""
import time
import urllib.parse
from pathlib import Path

from weread_dump import attach  # reuse the raw-CDP attach that survives a heavy Colab tab

HERE = Path(__file__).resolve().parent
DOWNLOADS = Path.home() / "Downloads"


def main():
    url = (HERE.parent / "app" / "bookmarklet.txt").read_text(encoding="utf-8")
    assert url.startswith("javascript:"), "build-bookmarklet.mjs has not been run"
    code = urllib.parse.unquote(url[len("javascript:") :])

    before = {p.name for p in DOWNLOADS.glob("weread-*.json")}
    page, opened = attach()
    print(f"attached ({'new tab' if opened else 'reused'})")

    # make sure we are actually on weread, the bookmarklet refuses to run anywhere else
    here = page.evaluate("location.hostname")
    print("hostname:", here)
    if not str(here).endswith("weread.qq.com"):
        page.call("Page.navigate", {"url": "https://weread.qq.com/"})
        time.sleep(4)

    page.evaluate(code)
    print("bookmarklet injected, waiting for it to finish…")

    banner = ""
    for _ in range(40):
        time.sleep(2)
        try:
            banner = page.evaluate(
                "(()=>{const d=[...document.querySelectorAll('div')]"
                ".filter(e=>e.textContent.startsWith('[卷中故人]'));"
                "return d.length?d[d.length-1].textContent:''})()"
            ) or ""
        except Exception as e:  # noqa: BLE001
            print("read banner failed:", e)
            break
        if banner:
            print("  ", banner.replace("\n", " | ")[:120])
        if "导出完成" in banner or "失败" in banner or "出错" in banner or "没有找到" in banner:
            break

    time.sleep(3)
    after = {p.name for p in DOWNLOADS.glob("weread-*.json")}
    new = sorted(after - before)
    if new:
        f = DOWNLOADS / new[-1]
        print(f"\n下载成功: {f}  ({f.stat().st_size/1024:.1f} KB)")
    else:
        print("\n没有新文件落到下载目录（可能是浏览器拦了下载，看上面的横幅文字）")
    page.close()


if __name__ == "__main__":
    main()
