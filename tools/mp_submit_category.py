#!/usr/bin/env python3
"""mp_submit_category.py - tick 已阅读并了解类目审核规则 and submit the category for review.

确定 on the picker opens a second dialog (申请类目相关须知 / 确认提交类目审核？) with a rules
checkbox. Nothing is submitted until that one is accepted, which is why the first confirm left
「你还没有添加任何服务类目」 on screen.

That dialog also states 如误申请通过导致相关能力被封禁，可自行删除类目解除封禁 — the choice is
reversible, which is the main reason this is safe to press.

  python mp_submit_category.py
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web import attach  # noqa: E402

VIS = """
const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
  return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; };
"""

TICK = """
(() => { %s
  const RULE = '已阅读并了解类目审核规则';
  // the checkbox itself is usually visually hidden behind a styled label
  let box = [...document.querySelectorAll('input[type=checkbox]')]
    .find(c => (c.closest('label')||{}).innerText?.includes(RULE))
    || [...document.querySelectorAll('input[type=checkbox]')].pop();
  if (!box) return {ok:false, why:'no checkbox'};
  if (!box.checked) {
    const lab = document.querySelector('label[for="' + box.id + '"]') || box.closest('label');
    if (lab) lab.click();
    if (!box.checked) { box.click(); }
    if (!box.checked) { box.checked = true; box.dispatchEvent(new Event('change', {bubbles:true})); }
  }
  const buttons = [...document.querySelectorAll('button,a')].filter(vis)
    .map(b => ({ t: (b.innerText||'').trim(), disabled: !!b.disabled }))
    .filter(b => b.t);
  return {ok: box.checked, checked: box.checked, buttons: buttons.slice(0, 10)};
})()
""" % VIS

SUBMIT = """
(() => { %s
  const b = [...document.querySelectorAll('button,a')].filter(vis)
    .find(x => ['确定','提交','确认提交'].includes((x.innerText||'').trim()) && !x.disabled);
  if (!b) return {ok:false, why:'no enabled submit button'};
  b.click(); return {ok:true, clicked:(b.innerText||'').trim()};
})()
""" % VIS

AFTER = """
(() => { %s
  const t = document.body.innerText || '';
  return {
    stillEmpty: t.includes('你还没有添加任何服务类目'),
    hasMemo: t.includes('备忘录'),
    lines: t.split('\\n').map(s=>s.trim()).filter(s=>s.length>2 && s.length<60).slice(0, 16)
  };
})()
""" % VIS


def main():
    p = attach("category")
    try:
        print("tick:", json.dumps(p.ev(TICK), ensure_ascii=False))
        time.sleep(1.5)
        print("submit:", json.dumps(p.ev(SUBMIT), ensure_ascii=False))
        time.sleep(6)
        print("after:", json.dumps(p.ev(AFTER), ensure_ascii=False, indent=2))
    finally:
        p.close()


if __name__ == "__main__":
    main()
