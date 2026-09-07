#!/usr/bin/env python3
"""fixture_stats.py - field-coverage report for the harvested WeRead fixture.

Prints structure and coverage only, never the note text itself, so the fixture can be
sanity-checked without spilling personal reading notes into a transcript.
"""
import io
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
FIX = Path(__file__).resolve().parent.parent / "fixtures"

rows = []
for f in sorted(FIX.glob("weread_*.json")):
    d = json.load(io.open(f, encoding="utf-8"))
    revs = ((d.get("reviews") or {}).get("reviews")) or []
    for it in revs:
        rv = it.get("review", it) or {}
        rows.append(rv)

print(f"条目总数: {len(rows)}")
print(f"书本数  : {len({r.get('bookId') for r in rows})}\n")

FIELDS = ["abstract", "content", "chapterTitle", "chapterUid", "chapterIdx", "createTime", "reviewId", "bookId", "range", "type"]
print(f"{'字段':<14}{'非空数':>7}{'覆盖率':>9}   说明")
DESC = {
    "abstract": "被划线的原文",
    "content": "自己写的想法",
    "chapterTitle": "章节名",
    "chapterUid": "章节唯一 id",
    "chapterIdx": "章节序号",
    "createTime": "创建时间戳",
    "reviewId": "去重主键",
    "bookId": "书 id",
    "range": "在原文中的位置",
    "type": "条目类型",
}
for k in FIELDS:
    n = sum(1 for r in rows if r.get(k) not in (None, "", []))
    print(f"{k:<14}{n:>7}{n / len(rows) * 100:>8.0f}%   {DESC[k]}")

print("\ntype 分布:", dict(Counter(r.get("type") for r in rows)))

both = sum(1 for r in rows if r.get("abstract") and r.get("content"))
only_abs = sum(1 for r in rows if r.get("abstract") and not r.get("content"))
only_con = sum(1 for r in rows if r.get("content") and not r.get("abstract"))
print(f"\n划线+想法都有: {both}")
print(f"只有划线原文  : {only_abs}")
print(f"只有想法无原文: {only_con}   <- 这些是整章想法，不挂在具体句子上")

ts = [r["createTime"] for r in rows if r.get("createTime")]
if ts:
    lo = datetime.fromtimestamp(min(ts), timezone.utc).date()
    hi = datetime.fromtimestamp(max(ts), timezone.utc).date()
    print(f"\n时间跨度: {lo} .. {hi}  ({len(set(ts))} 个不同时间戳)")

alens = [len(r.get("abstract") or "") for r in rows if r.get("abstract")]
clens = [len(r.get("content") or "") for r in rows if r.get("content")]
if alens:
    print(f"划线原文长度: 最短 {min(alens)}  中位 {sorted(alens)[len(alens)//2]}  最长 {max(alens)} 字")
if clens:
    print(f"想法长度    : 最短 {min(clens)}  中位 {sorted(clens)[len(clens)//2]}  最长 {max(clens)} 字")

dupes = len(rows) - len({r.get("reviewId") for r in rows})
print(f"\nreviewId 重复数: {dupes}  (0 表示可直接用作去重主键)")
