"""Genera le icone PNG della PWA (richiede Pillow: pip install pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "src" / "icons"
GREEN = (29, 185, 84, 255)
DARK = (18, 18, 18, 255)
WHITE = (255, 255, 255, 255)


def note(draw, size, scale):
    """Disegna una croma bianca centrata, in scala rispetto al lato."""
    s = size * scale
    ox = (size - s) / 2
    oy = (size - s) / 2
    p = lambda x, y: (ox + x * s, oy + y * s)

    r = 0.17  # raggio delle teste
    for cx in (0.30, 0.70):
        draw.ellipse([*p(cx - r, 0.68 - r * 0.8), *p(cx + r, 0.68 + r * 0.8)], fill=WHITE)
    stem = 0.06
    for cx in (0.30 + r - stem, 0.70 + r - stem):
        draw.rectangle([*p(cx, 0.22), *p(cx + stem, 0.68)], fill=WHITE)
    draw.polygon(
        [p(0.30 + r - stem, 0.22), p(0.70 + r, 0.12), p(0.70 + r, 0.28), p(0.30 + r - stem, 0.38)],
        fill=WHITE,
    )


def make(size, name, maskable=False):
    img = Image.new("RGBA", (size, size), DARK if maskable else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=GREEN)
        note(d, size, 0.55)          # zona sicura: ~80% centrale
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 5, fill=GREEN)
        note(d, size, 0.7)
    img.save(OUT / name)
    print("creato", name)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    make(192, "icon-192.png")
    make(512, "icon-512.png")
    make(512, "icon-maskable-512.png", maskable=True)
    make(180, "apple-touch-icon.png", maskable=True)
