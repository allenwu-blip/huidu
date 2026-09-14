#!/usr/bin/env python3
"""make_share_card.py - the 1200x630 card that appears when the link is shared.

即刻 and WeChat render a bare link as a domain with no preview, which costs clicks on the one
channel that is actually running. This is the single place in the product where an image does
real work, so it gets made properly rather than decoratively.

It draws the product's own object: one page, with its running head, 藏书章, printed passage
and a 旁批 in 楷体, on the same paper as the app. Same tokens as app/index.html.

Type: fonts-src/ (gitignored; see tools/subset_fonts.py) holds 思源宋体 and 霞鹜文楷. Without
them the script falls back to the Windows system faces and still produces a usable card.

  python tools/make_share_card.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
FONTS = ROOT / "fonts-src"

W, H = 1200, 630
# 纸与墨: warm paper ground, the sheet a shade lighter, seal as the single accent.
PAPER = (235, 229, 216)
PAPER_HI = (248, 245, 238)
INK = (35, 31, 25)
INK_2 = (90, 82, 69)
INK_3 = (138, 128, 113)
SEAL = (178, 58, 46)
RULE = (216, 208, 191)
CLOTH = (86, 118, 97)  # 松绿, the same hsl(148 22% 38%) the landing demo uses

SERIF_B = [FONTS / "NotoSerifCJKsc-SemiBold.otf", Path(r"C:\Windows\Fonts\simsun.ttc")]
SERIF = [FONTS / "NotoSerifCJKsc-Regular.otf", Path(r"C:\Windows\Fonts\simsun.ttc")]
KAI = [FONTS / "LXGWWenKai-Regular.ttf", Path(r"C:\Windows\Fonts\simkai.ttf"), FONTS / "NotoSerifCJKsc-Regular.otf"]
SANS = [Path(r"C:\Windows\Fonts\msyh.ttc"), Path(r"C:\Windows\Fonts\simhei.ttf")]


def font(paths, px):
    for p in paths:
        if Path(p).exists():
            try:
                return ImageFont.truetype(str(p), px)
            except Exception:  # noqa: BLE001
                continue
    return ImageFont.load_default()


def paper_ground():
    """Warm paper with a soft light falloff from the top and a whisper of grain."""
    img = Image.new("RGB", (W, H), PAPER)
    px = img.load()
    cx, cy = W * 0.5, H * -0.2
    maxd = math.hypot(W, H)
    for y in range(H):
        for x in range(0, W, 2):  # every other column, then blur: 4x faster, same result
            d = math.hypot(x - cx, y - cy) / maxd
            t = max(0.0, 1.0 - d * 1.35)
            c = tuple(int(PAPER[i] + (PAPER_HI[i] - PAPER[i]) * t * 0.55) for i in range(3))
            px[x, y] = c
            if x + 1 < W:
                px[x + 1, y] = c
    img = img.filter(ImageFilter.GaussianBlur(1.2))

    grain = Image.new("L", (W, H))
    gp = grain.load()
    rnd = random.Random(7)  # fixed seed: the card must be byte-stable across rebuilds
    for y in range(H):
        for x in range(W):
            gp[x, y] = 128 + rnd.randint(-9, 9)
    return Image.blend(img, Image.merge("RGB", (grain, grain, grain)), 0.05)


def chop(base, x, y, size, glyph, angle=-7, alpha=200):
    """A seal: red square outline with one glyph, turned a few degrees like a real stamp."""
    pad = size // 2
    layer = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    border = max(2, int(size * 0.05))
    col = SEAL + (alpha,)
    d.rounded_rectangle([pad, pad, pad + size, pad + size], radius=int(size * 0.08), outline=col, width=border)
    f = font(SERIF_B, int(size * 0.6))
    l, t, r, b = d.textbbox((0, 0), glyph, font=f)
    d.text((pad + size / 2 - (l + r) / 2, pad + size / 2 - (t + b) / 2), glyph, font=f, fill=col)
    layer = layer.rotate(angle, resample=Image.BICUBIC, expand=False)
    base.paste(layer, (int(x - pad), int(y - pad)), layer)


def shadow(base, box, radius, blur, alpha):
    """Tinted soft shadow under the page, drawn on its own layer so the paper stays clean."""
    x0, y0, x1, y1 = box
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0, y0 + 10, x1, y1 + 14], radius=radius, fill=(60, 44, 18, alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    base.paste(layer, (0, 0), layer)


def main():
    img = paper_ground()
    d = ImageDraw.Draw(img)
    M = 84

    # brand row
    chop(img, M, M - 8, 60, "回", angle=-6, alpha=255)
    d.text((M + 84, M - 4), "回甘", font=font(SERIF_B, 52), fill=INK)
    d.text((M + 84, M + 56), "划过的线，过些日子再读一遍", font=font(SERIF, 27), fill=INK_2)

    # the page
    px0, py0, px1, py1 = M, 196, W - M, 552
    img_rgba = img.convert("RGBA")
    shadow(img_rgba, (px0, py0, px1, py1), 6, 18, 60)
    img = img_rgba.convert("RGB")
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([px0, py0, px1, py1], radius=6, fill=PAPER_HI, outline=(222, 214, 198), width=1)
    d.rounded_rectangle([px0, py0, px0 + 7, py1], radius=3, fill=CLOTH)

    ix = px0 + 46  # inner left
    f_bk = font(SERIF_B, 24)
    d.text((ix, py0 + 34), "呐喊", font=f_bk, fill=INK)
    d.text((ix + 70, py0 + 40), "鲁迅", font=font(SANS, 18), fill=INK_3)
    f_meta = font(SANS, 18)
    d.text((ix, py0 + 72), "故乡", font=f_meta, fill=INK_3)
    right = "三年十个月前  ·  第一次见"
    rw = d.textlength(right, font=f_meta)
    d.text((px1 - 120 - rw, py0 + 72), "三年十个月前", font=f_meta, fill=CLOTH)
    aw = d.textlength("三年十个月前", font=f_meta)
    d.text((px1 - 120 - rw + aw, py0 + 72), "  ·  第一次见", font=f_meta, fill=INK_3)
    chop(img, px1 - 96, py0 + 34, 52, "呐", angle=-7, alpha=190)
    d.line([ix, py0 + 112, px1 - 46, py0 + 112], fill=RULE, width=1)

    f_quote = font(SERIF, 38)
    d.text((ix, py0 + 142), "其实地上本没有路，走的人多了，也便成了路。", font=f_quote, fill=INK)

    d.text((ix, py0 + 224), "›  你当时写了一句话", font=font(SERIF, 19), fill=INK_3)
    d.line([ix, py0 + 266, ix, py0 + 310], fill=CLOTH, width=2)
    d.text((ix + 24, py0 + 268), "小学课本里读过，当时不懂为什么这句要放在最后。", font=font(KAI, 26), fill=INK_2)

    d.text((M, 578), "不用注册，没有云，数据只在你自己的浏览器里", font=font(SANS, 20), fill=INK_3)

    p = OUT / "share-card.png"
    img.save(p, optimize=True)
    print(f"{p}  {p.stat().st_size / 1024:.1f} KB  {W}x{H}")


if __name__ == "__main__":
    main()
