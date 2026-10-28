# Cuts characters out of a picture from tools/swarm.py: the white background goes transparent, and
# each separate figure, left to right, is saved as its own sprite in img/.
#   python3 tools/cutout.py art/source/gen/dadsheet-4.png dad-reach dad-big dad-dangle dad
# A name of "-" skips that figure. Sprites are scaled to at most --height pixels tall.
import argparse
from collections import deque

from PIL import Image, ImageDraw

WHITE = 238  # a pixel brighter than this in every channel counts as background


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("names", nargs="+")
    ap.add_argument("--height", type=int, default=320)
    ap.add_argument("--min", type=float, default=0.01, help="smallest figure, as a share of the picture")
    a = ap.parse_args()

    im = Image.open(a.src).convert("RGBA")
    w, h = im.size
    # flood the background away from every white spot on the edge
    clear = (255, 255, 255, 0)
    for x, y in [(x, 0) for x in range(0, w, 8)] + [(x, h - 1) for x in range(0, w, 8)] + \
                [(0, y) for y in range(0, h, 8)] + [(w - 1, y) for y in range(0, h, 8)]:
        r, g, b, al = im.getpixel((x, y))
        if al and min(r, g, b) > WHITE:
            ImageDraw.floodfill(im, (x, y), clear, thresh=40)

    # figures: groups of solid pixels, found on a half-size copy to keep it quick
    small = im.resize((w // 2, h // 2), Image.NEAREST)
    sw, sh = small.size
    alpha = small.getchannel("A").load()
    seen = bytearray(sw * sh)
    figures = []
    for sy in range(sh):
        for sx in range(sw):
            if seen[sy * sw + sx] or alpha[sx, sy] == 0:
                continue
            q = deque([(sx, sy)])
            seen[sy * sw + sx] = 1
            x0, y0, x1, y1, n = sx, sy, sx, sy, 0
            while q:
                cx, cy = q.popleft()
                n += 1
                x0, y0, x1, y1 = min(x0, cx), min(y0, cy), max(x1, cx), max(y1, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and not seen[ny * sw + nx] and alpha[nx, ny]:
                        seen[ny * sw + nx] = 1
                        q.append((nx, ny))
            if n >= a.min * sw * sh:
                figures.append((x0 * 2, y0 * 2, x1 * 2 + 2, y1 * 2 + 2))
    figures.sort()
    print(f"{len(figures)} figures: {figures}")
    for name, box in zip(a.names, figures):
        if name == "-":
            continue
        sprite = im.crop(box)
        if sprite.height > a.height:
            sprite = sprite.resize((round(sprite.width * a.height / sprite.height), a.height), Image.LANCZOS)
        sprite.save(f"img/{name}.png")
        print(f"img/{name}.png {sprite.size}")


main()
