#!/usr/bin/env python3
"""subset_fonts.py - cut the landing page's webfonts down to the glyphs it actually uses.

The landing is fixed text, so it can carry real type: 思源宋体 for display and 霞鹜文楷 for the
sample 旁批. The full families are 20+ MB each; the landing needs a few hundred glyphs, which
comes to roughly 150 KB per face as woff2. The app cannot do this (its text is the reader's
own) and keeps using system fonts.

Source fonts are not in the repo (20+ MB each). They live in fonts-src/ at the repo root, which
is gitignored; pass another folder as the first argument if they are elsewhere. Needed:
  NotoSerifCJKsc-Regular.otf  NotoSerifCJKsc-SemiBold.otf  LXGWWenKai-Regular.ttf
  (github.com/notofonts/noto-cjk, Serif/OTF/SimplifiedChinese; github.com/lxgw/LxgwWenKai releases)

  python tools/subset_fonts.py [font-src-dir]

Licences: Noto Serif CJK is SIL OFL 1.1; LXGW WenKai is SIL OFL 1.1. Both allow subsetting
and bundling; both forbid selling the fonts on their own, which nothing here does.
"""
import re
import sys
from pathlib import Path

from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
LANDING = ROOT / "landing" / "index.html"
OUT = ROOT / "landing" / "fonts"

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fonts-src"

html = LANDING.read_text("utf-8")
body = re.sub(r"<style>.*?</style>", "", html, flags=re.S)
body = re.sub(r"<script>.*?</script>", "", body, flags=re.S)
# alt/title/aria-label text never renders in these faces; tags go, entities are few and ASCII
visible = re.sub(r"<[^>]+>", "", body)
visible = re.sub(r"&[a-z]+;", " ", visible)

# everything the page shows, plus what the live demo cards can produce at runtime
ALWAYS = "0123456789／·「」『』（）《》〈〉，。；：？！、…—一二三四五六七八九十百零年月日天前后见次第今昨刚"
serif_chars = set(visible) | set(ALWAYS)
serif_chars -= set("\r\n\t　")

# 楷体 only ever sets the sample 旁批 lines and the kai-tagged spans
kai_bits = re.findall(r'class="(?:note|kai)[^"]*"[^>]*>(.*?)</', html, flags=re.S)
kai_chars = set(re.sub(r"<[^>]+>", "", "".join(kai_bits))) | set(ALWAYS)
kai_chars -= set("\r\n\t　")


def cut(src_name, out_name, chars):
    src = SRC / src_name
    if not src.exists():
        sys.exit(f"missing {src}")
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.hinting = False
    opts.desubroutinize = True
    opts.layout_features = ["kern", "palt", "vert", "vrt2", "liga", "calt", "locl", "ccmp"]
    opts.name_IDs = [0, 1, 2, 3, 4, 6]  # keep licence/copyright names, drop the rest
    opts.notdef_outline = True
    font = subset.load_font(str(src), opts)
    s = subset.Subsetter(opts)
    s.populate(text="".join(sorted(chars)))
    s.subset(font)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / out_name
    subset.save_font(font, str(out), opts)
    print(f"{out_name:26} {len(chars):4d} chars  {out.stat().st_size / 1024:6.1f} KB")


cut("NotoSerifCJKsc-Regular.otf", "serif-400.woff2", serif_chars)
cut("NotoSerifCJKsc-SemiBold.otf", "serif-600.woff2", serif_chars)
cut("LXGWWenKai-Regular.ttf", "kai.woff2", kai_chars)
