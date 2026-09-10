#!/usr/bin/env python3
"""mp_confirm_category.py - press 确定 on the 添加类目 dialog and verify the row landed.

Kept separate from the picker script because this is the step that consumes one of the five
monthly adds. It re-checks the selected path immediately before clicking, so a dialog that
drifted between calls cannot be confirmed by accident.

  python mp_confirm_category.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web import attach  # noqa: E402

WANT_L1 = "工具"
WANT_L2 = "备忘录"

VIS = """
const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
  return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
"""

# Check the rendered TEXT, not an input value.
#
# Two wrong guesses preceded this one. Once a leaf is picked the search <input> is hidden and
# the chosen path is drawn as plain text, so querying inputs reported "nothing selected" while
# the screen plainly read 工具 > 备忘录. Screenshots were right both times and the DOM guesses
# were wrong, so this asserts on what is actually painted.
CHECK = """
(() => { %s
  const L1 = %s, L2 = %s;
  const dialog = [...document.querySelectorAll('div')]
    .filter(e => vis(e) && (e.innerText||'').includes('添加类目') && (e.innerText||'').includes('确定'))
    .sort((a,b) => a.innerText.length - b.innerText.length)[0];
  const txt = dialog ? (dialog.innerText||'') : (document.body.innerText||'');
  const line = txt.split('\\n').map(s=>s.trim()).find(s => s.includes(L1) && s.includes(L2));
  return {
    dialogFound: !!dialog,
    selectedLine: line || null,
    ok: !!line,
  };
})()
""" % (VIS, json.dumps(WANT_L1), json.dumps(WANT_L2))

CONFIRM = """
(() => { %s
  const b = [...document.querySelectorAll('button,a')].filter(vis)
    .find(x => (x.innerText||'').trim() === '确定');
  if (!b) return {ok:false, why:'no 确定'};
  if (b.disabled) return {ok:false, why:'确定 disabled'};
  b.click(); return {ok:true};
})()
""" % VIS

ROWS = """
(() => { %s
  const rows = [...document.querySelectorAll('tr,li,div')]
    .filter(e => vis(e) && (e.innerText||'').includes(%s) && (e.innerText||'').trim().length < 80)
    .map(e => (e.innerText||'').replace(/\\n+/g,' | ').trim());
  return { any: rows.length > 0, rows: [...new Set(rows)].slice(0, 4),
           page: (document.body.innerText||'').split('\\n').map(s=>s.trim())
                   .filter(s => s.length > 3 && s.length < 60).slice(0, 14) };
})()
""" % (VIS, json.dumps(WANT_L2))


def main():
    p = attach("category")
    try:
        chk = p.ev(CHECK)
        print("selected before confirm:", json.dumps(chk, ensure_ascii=False))
        if not chk.get("ok"):
            print("selection is not 工具 > 备忘录; refusing to spend a monthly add")
            return
        print("confirm:", json.dumps(p.ev(CONFIRM), ensure_ascii=False))
        time.sleep(6)
        print("after:", json.dumps(p.ev(ROWS), ensure_ascii=False, indent=2))
    finally:
        p.close()


if __name__ == "__main__":
    main()
