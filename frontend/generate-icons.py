"""Generate PWA icons for Jarvis."""
from PIL import Image, ImageDraw


def create_icon(size, path):
    img = Image.new("RGBA", (size, size), (10, 14, 26, 255))
    draw = ImageDraw.Draw(img)
    cx = cy = size // 2
    r = size * 0.4
    # Outer ring
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(0, 212, 255, 200), width=max(2, size // 30))
    # Inner ring
    draw.ellipse([cx - r * 0.65, cy - r * 0.65, cx + r * 0.65, cy + r * 0.65],
                 outline=(0, 212, 255, 80), width=max(1, size // 50))
    # Center dot
    dot_r = max(3, size // 20)
    draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=(0, 212, 255, 255))
    # Crosshairs
    hl = size * 0.15
    lw = max(1, size // 60)
    draw.line([cx, cy - r - hl, cx, cy - r + hl], fill=(0, 212, 255, 120), width=lw)
    draw.line([cx, cy + r - hl, cx, cy + r + hl], fill=(0, 212, 255, 120), width=lw)
    draw.line([cx - r - hl, cy, cx - r + hl, cy], fill=(0, 212, 255, 120), width=lw)
    draw.line([cx + r - hl, cy, cx + r + hl, cy], fill=(0, 212, 255, 120), width=lw)
    img.save(path, "PNG")


create_icon(192, "public/icon-192.png")
create_icon(512, "public/icon-512.png")
print("Icons generated")
