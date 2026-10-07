"""Draws the Teatime icon (a yellow shelf-edge price tag on basil green) and writes
Android launcher icons, adaptive-icon foregrounds and splash screens."""
from PIL import Image, ImageDraw, ImageFont
import glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android/app/src/main/res")
GREEN, YELLOW, INK = (30, 106, 68), (245, 211, 59), (22, 34, 26)
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"


def tag(size, scale=1.0):
    """Transparent square image with the tag drawn centred; scale 1 fills ~62% width."""
    S = 2048
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w, h = int(S * 0.62 * scale), int(S * 0.42 * scale)
    x0, y0 = (S - w) // 2, (S - h) // 2 - int(S * 0.02 * scale)
    r = int(h * 0.16)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], r, fill=YELLOW)
    # dashed tear-off strip under the label, like a supermarket shelf edge
    dash, gap, top = int(w / 13), int(w / 26), y0 + h + int(h * 0.07)
    x = x0
    while x < x0 + w:
        d.rectangle([x, top, min(x + dash, x0 + w), top + int(h * 0.09)], fill=YELLOW)
        x += dash + gap
    # punched hole
    hr = int(h * 0.075)
    hx, hy = x0 + int(h * 0.2), y0 + h // 2
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(0, 0, 0, 0))
    # wordmark
    font = ImageFont.truetype(FONT, int(h * 0.62))
    text = "Tea"
    tb = d.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = x0 + int(h * 0.36) + (w - int(h * 0.36) - tw) // 2 - tb[0]
    ty = y0 + (h - th) // 2 - tb[1]
    d.text((tx, ty), text, font=font, fill=INK)
    img = img.rotate(8, resample=Image.BICUBIC)
    return img.resize((size, size), Image.LANCZOS)


def full_icon(size, round_=False):
    S = 2048
    bg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    m = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(m)
    if round_:
        md.ellipse([0, 0, S - 1, S - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, S - 1, S - 1], int(S * 0.22), fill=255)
    bg.paste(Image.new("RGBA", (S, S), GREEN + (255,)), (0, 0), m)
    bg.alpha_composite(tag(S, 1.05))
    return bg.resize((size, size), Image.LANCZOS)


dens = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, k in dens.items():
    folder = os.path.join(RES, f"mipmap-{name}")
    os.makedirs(folder, exist_ok=True)
    full_icon(int(48 * k)).save(os.path.join(folder, "ic_launcher.png"))
    full_icon(int(48 * k), round_=True).save(os.path.join(folder, "ic_launcher_round.png"))
    fg = tag(int(108 * k), 1.0)  # adaptive foreground: content inside the 66dp safe zone
    fg.save(os.path.join(folder, "ic_launcher_foreground.png"))

# adaptive icon background colour, and point the foreground at the PNG (not the template vector)
with open(os.path.join(RES, "values/ic_launcher_background.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1E6A44</color>\n</resources>\n')
vec = os.path.join(RES, "drawable-v24/ic_launcher_foreground.xml")
if os.path.exists(vec):
    os.remove(vec)

# splash screens: basil background with the tag in the middle, same pixel sizes as the template
for p in glob.glob(os.path.join(RES, "drawable*/splash.png")):
    w, h = Image.open(p).size
    img = Image.new("RGB", (w, h), GREEN)
    t = tag(int(min(w, h) * 0.55), 1.0)
    img.paste(t, ((w - t.width) // 2, (h - t.height) // 2), t)
    img.save(p)

full_icon(512).save(os.path.join(ROOT, "src/icon.png"))
print("icons written")
