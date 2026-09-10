#!/usr/bin/env python3
"""wait_category_picker.py - hold on the 添加类目 dialog until the real picker appears.

The first attempt read the dialog once, immediately, and saw it already closed — which looked
like the scan had failed when it had probably just not finished swapping the QR for the picker.
This polls instead, and reports what it actually sees each time so a stall is visible rather
than guessed at.

  python wait_category_picker.py [seconds]
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web import attach  # noqa: E402

SCAN = "扫码"          # 扫码
TOOL = "工具"          # 工具
CANCEL = "取消"        # 取消

PROBE = """
(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
  const t = document.body.innerText || '';
  const cells = [...document.querySelectorAll('li,a,div,span,label')]
    .filter(e => { const x=(e.innerText||'').trim();
      return vis(e) && x.length>=2 && x.length<=16 && e.children.length===0
             && e.getBoundingClientRect().height < 60; })
    .map(e => (e.innerText||'').trim());
  const uniq = [...new Set(cells)];
  return {
    qr: t.includes('%s'),
    hasTool: uniq.some(x => x.includes('%s')),
    toolCells: uniq.filter(x => x.includes('%s')),
    selects: [...document.querySelectorAll('select')].filter(vis).length,
    cellCount: uniq.length,
    sample: uniq.slice(0, 30)
  };
})()
""" % (SCAN, TOOL, TOOL)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    p = attach("category")
    try:
        deadline = time.time() + limit
        last = None
        while time.time() < deadline:
            r = p.ev(PROBE)
            state = (r["qr"], r["hasTool"], r["cellCount"])
            if state != last:
                print(f"{time.strftime('%H:%M:%S')} qr={r['qr']} tool={r['hasTool']} cells={r['cellCount']}")
                last = state
            if r["hasTool"] or r["selects"] or r["cellCount"] > 24:
                print("\npicker is up:")
                print(json.dumps(r, ensure_ascii=False, indent=2))
                return
            time.sleep(4)
        print("\ntimed out; last seen:")
        print(json.dumps(p.ev(PROBE), ensure_ascii=False, indent=2))
    finally:
        p.close()


if __name__ == "__main__":
    main()
