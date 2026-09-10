#!/usr/bin/env python3
"""make_share_card.py - the 1200x630 card that appears when the link is shared.

Right now 即刻 and WeChat render the link as a bare domain, which costs clicks on the one
channel that is actually running. This is the single place in the product where an image does
real work, so it gets made properly rather than decoratively.

Design follows the same brief as the app — 简约大气有质感: paper ground, one 朱砂 accent, type
doing the work. The apps that win this category (Readwise Reader, Matter, Instapaper) win on
typography and restraint, so nothing here is added that a reader would not miss.

  python make_share_card.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent.parent / "app" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
# Neutral ground and ink, seal as the single accent. Kept in step with app/index.html tokens.
PAPER = (246, 246, 244)
PAPER_HI = (252, 252, 251)
INK = (28, 28, 26)
INK_2 = (87, 86, 79)
INK_3 = (138, 137, 127)
SEAL = (176, 48, 42)
RULE = (222, 222, 218)

SERIF = [r"C:\Windows\Fonts\simsun.ttc", r"C:\Windows\Fonts\simkai.ttf"]
SANS = [r"C:\Windows\Fonts\msyh.ttc", r"C:\Windows\Fonts\simhei.ttf"]


def font(paths, px):
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(p, px)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def paper_ground():
    """Warm paper with a soft light falloff and a whisper of grain."""
    img = Image.new("RGB", (W, H), PAPER)
    px = img.load()
    cx, cy = W * 0.42, H * -0.15
    maxd = math.hypot(W, H)
    for y in range(H):
        for x in range(0, W, 2):  # every other column, then blur — 4x faster, same result
            d = math.hypot(x - cx, y - cy) / maxd
            t = max(0.0, 1.0 - d * 1.25)
            c = tuple(int(PAPER[i] + (PAPER_HI[i] - PAPER[i]) * t) for i in range(3))
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    img = img.filter(ImageFilter.GaussianBlur(1.2))

    grain = Image.new("L", (W, H))
    gp = grain.load()
    rnd = random.Random(7)  # fixed seed: the card must be byte-stable across rebuilds
    for y in range(H):
        for x in range(W):
            gp[x, y] = 128 + rnd.randint(-7, 7)
    return Image.blend(img, Image.merge("RGB", (grain, grain, grain)), 0.045)


def seal(d, x, y, size):
    border = max(2, int(size * 0.055))
    d.rounded_rectangle([x, y, x + size, y + size], radius=int(size * 0.08), outline=SEAL, width=border)
    f = font(SERIF, int(size * 0.6))
    l, t, r, b = d.textbbox((0, 0), "回", font=f)
    d.text((x + size / 2 - (l + r) / 2, y + size / 2 - (t + b) / 2), "回", font=f, fill=SEAL)


def main():
    img = paper_ground()
    d = ImageDraw.Draw(img)

    M = 92  # margin
    seal(d, M, M - 6, 84)

    f_name = font(SERIF, 76)
    d.text((M + 112, M + 2), "回读", font=f_name, fill=INK)

    f_lead = font(SERIF, 34)
    d.text((M, M + 146), "把你划过的线，每天推几条回来", font=f_lead, fill=INK_2)

    # a real card, shown small: the promise is easier to believe when you can see the thing.
    # Height is chosen so the card ends at 504 and the footer sits clear of it at 548 — the
    # first pass had them overlapping.
    cy = M + 218
    ch = 194
    d.rounded_rectangle([M, cy, W - M, cy + ch], radius=4, fill=PAPER_HI, outline=RULE, width=1)
    d.rounded_rectangle([M, cy, M + 4, cy + ch], radius=2, fill=(66, 96, 122))

    f_meta = font(SANS, 20)
    d.text((M + 40, cy + 26), "四年前的今天 · 你在读这本书", font=f_meta, fill=INK_3)

    f_quote = font(SERIF, 33)
    for i, line in enumerate(["划完就沉底了，一次都没再看过。", "真正让人停一下的，是我当时在想什么。"]):
        d.text((M + 40, cy + 68 + i * 52), line, font=f_quote, fill=INK)

    f_foot = font(SANS, 22)
    d.text((M, 548), "不用注册 · 没有云 · 数据只在你自己的浏览器里", font=f_foot, fill=INK_3)

    p = OUT / "share-card.png"
    img.save(p, optimize=True)
    print(f"{p}  {p.stat().st_size/1024:.1f} KB  {W}x{H}")


if __name__ == "__main__":
    main()
