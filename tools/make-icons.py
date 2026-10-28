# Draws placeholder app icons: one big glowing Christmas bulb on a night-blue square.
# Run from the project folder:  python3 tools/make-icons.py
from PIL import Image, ImageDraw, ImageFilter


def bulb(size, margin):
    img = Image.new("RGBA", (size, size), (11, 20, 51, 255))
    s = (size - 2 * margin) / 100  # draw on a 100-unit grid inside the margin

    def box(x0, y0, x1, y1):
        return [margin + x0 * s, margin + y0 * s, margin + x1 * s, margin + y1 * s]

    def pts(*xy):
        return [(margin + x * s, margin + y * s) for x, y in xy]

    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(box(14, 26, 86, 98), fill=(255, 70, 60, 170))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size / 14)))
    d = ImageDraw.Draw(img)
    d.line(pts((0, 14), (30, 20), (50, 18), (70, 20), (100, 14)), fill=(31, 61, 31), width=round(4 * s))
    d.rounded_rectangle(box(38, 14, 62, 36), radius=round(3 * s), fill=(47, 107, 47))
    d.ellipse(box(26, 32, 74, 72), fill=(255, 59, 59))
    d.polygon(pts((27, 56), (73, 56), (56, 84), (50, 94), (44, 84)), fill=(255, 59, 59))
    d.ellipse(box(34, 40, 44, 58), fill=(255, 170, 160))
    return img


bulb(512, 40).save("icons/icon-512.png")
bulb(192, 15).save("icons/icon-192.png")
bulb(512, 110).save("icons/icon-maskable-512.png")
print("icons written")
