#!/usr/bin/env python3
"""make_icons.py - draw the app icon set.

A 朱砂 seal with 回 on warm paper: the same 纸与墨 language as the app, and it reads at 48px
where a detailed mark would turn to mush. Generated rather than hand-drawn so the whole set
stays in sync and there is no binary asset to keep in the repo by hand.

  python make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Icons live in app/ as source; tools/build.mjs copies them into docs/ with the manifest and
# service worker, so local dev and the deployed build resolve the same relative paths.
OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# the sheet colour (--paper-2) and the seal, in step with app/index.html tokens
PAPER = (248, 245, 238)
SEAL = (178, 58, 46)
SIZES = [192, 512]

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\simsun.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def pick_font(px):
    for p in FONT_CANDIDATES:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, px)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def draw_icon(size, maskable=False):
    img = Image.new("RGB", (size, size), PAPER)
    d = ImageDraw.Draw(img)

    # maskable icons get their corners cropped by the OS, so keep the seal well inside
    inset = size * (0.24 if maskable else 0.16)
    box = [inset, inset, size - inset, size - inset]
    border = max(2, int(size * 0.035))
    radius = max(2, int(size * 0.05))
    d.rounded_rectangle(box, radius=radius, outline=SEAL, width=border)

    glyph = "卷"
    fsize = int((box[2] - box[0]) * 0.62)
    font = pick_font(fsize)
    l, t, r, b = d.textbbox((0, 0), glyph, font=font)
    cx = (box[0] + box[2]) / 2 - (l + r) / 2
    cy = (box[1] + box[3]) / 2 - (t + b) / 2
    d.text((cx, cy), glyph, font=font, fill=SEAL)
    return img


for s in SIZES:
    p = OUT / f"icon-{s}.png"
    draw_icon(s).save(p)
    print(f"{p.name}  {p.stat().st_size/1024:.1f} KB")

p = OUT / "icon-512-maskable.png"
draw_icon(512, maskable=True).save(p)
print(f"{p.name}  {p.stat().st_size/1024:.1f} KB")

# apple-touch-icon is not fetched from the manifest; iOS wants it as a <link> at 180px
p = OUT / "apple-touch-icon.png"
draw_icon(180).save(p)
print(f"{p.name}  {p.stat().st_size/1024:.1f} KB")
