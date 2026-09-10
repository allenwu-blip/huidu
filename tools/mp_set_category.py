#!/usr/bin/env python3
"""mp_set_category.py - pick 工具 in the 添加类目 dialog, in ONE CDP session.

Doing this as separate web.py calls does not work: each call opens its own websocket, the
combobox loses focus in between, and the option list collapses before the next call can click
it. Everything therefore happens on a single connection.

Browsing is free; only 确定 consumes one of the five monthly adds, so --confirm is opt-in.

  python mp_set_category.py            explore and report, change nothing
  python mp_set_category.py --confirm  also press 确定
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web import attach  # noqa: E402

TOOL = "工具"
KEY = "关键词"
OK = "确定"

VIS = """
const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
  return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
"""

FOCUS = """
(() => { %s
  const box = [...document.querySelectorAll('input')].filter(vis)
    .find(e => (e.placeholder||'').includes(%s));
  if (!box) return {ok:false, why:'no search box'};
  box.click(); box.focus();
  return {ok:true, active: document.activeElement === box};
})()
""" % (VIS, json.dumps(KEY))

LEAVES = """
(() => { %s
  return [...new Set([...document.querySelectorAll('li,a,div,span,label')]
    .filter(e => { const t=(e.innerText||'').trim();
      return vis(e) && t.length>=2 && t.length<=16 && e.children.length===0
             && e.getBoundingClientRect().height < 60; })
    .map(e => (e.innerText||'').trim()))];
})()
""" % VIS

CLICK = """
(() => { %s
  const t = %s;
  const el = [...document.querySelectorAll('li,a,div,span,label')]
    .filter(e => vis(e) && (e.innerText||'').trim() === t && e.children.length===0).pop();
  if (!el) return {ok:false, why:'not found: ' + t};
  el.click();
  return {ok:true};
})()
"""

CONFIRM = """
(() => { %s
  const b = [...document.querySelectorAll('button,a')].filter(vis)
    .find(x => (x.innerText||'').trim() === %s);
  if (!b) return {ok:false, why:'no 确定'};
  if (b.disabled) return {ok:false, why:'确定 disabled'};
  b.click(); return {ok:true};
})()
""" % (VIS, json.dumps(OK))


SELECTED = """
(() => { %s
  // what the combobox currently holds, so the pick is verified before 确定 is pressed
  const box = [...document.querySelectorAll('input')].filter(vis)
    .find(e => (e.placeholder||'').includes(%s) || e.value);
  return { value: box ? box.value : null,
           dialogText: (document.body.innerText||'').split('\\n').map(s=>s.trim())
             .filter(s => s.includes('/') && s.length < 40).slice(0, 5) };
})()
""" % (VIS, json.dumps(KEY))


def main():
    confirm = "--confirm" in sys.argv
    leaf = next((a for a in sys.argv[1:] if not a.startswith("--")), None)

    p = attach("category")
    try:
        print("focus:", json.dumps(p.ev(FOCUS), ensure_ascii=False))
        p.insert_text(TOOL)
        time.sleep(2.5)

        lvl1 = p.ev(LEAVES)
        if TOOL not in lvl1:
            print("工具 not in the list; nothing clicked")
            return
        print("click 工具:", json.dumps(p.ev(CLICK % (VIS, json.dumps(TOOL))), ensure_ascii=False))
        time.sleep(2.5)

        lvl2 = p.ev(LEAVES)
        new = [x for x in lvl2 if x not in lvl1]
        print("level-2:", json.dumps(new, ensure_ascii=False))

        if not leaf:
            print("\nno leaf given; explored only.")
            return
        if leaf not in new:
            print(f"\n{leaf} is not among the level-2 options; refusing to click blindly.")
            return

        print(f"click {leaf}:", json.dumps(p.ev(CLICK % (VIS, json.dumps(leaf))), ensure_ascii=False))
        time.sleep(2)
        print("selected:", json.dumps(p.ev(SELECTED), ensure_ascii=False))

        if confirm:
            print("confirm:", json.dumps(p.ev(CONFIRM), ensure_ascii=False))
            time.sleep(5)
            print("after:", json.dumps(p.ev(LEAVES), ensure_ascii=False)[:500])
        else:
            print("\nselected only. re-run with --confirm to press 确定.")
    finally:
        p.close()


if __name__ == "__main__":
    main()
