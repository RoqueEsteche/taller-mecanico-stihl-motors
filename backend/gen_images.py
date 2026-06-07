"""
Genera imágenes WebP placeholder para el catálogo y el hero.
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'assets', 'images')
PROD = os.path.join(OUT, 'productos')
os.makedirs(PROD, exist_ok=True)

DARK    = (30,  45,  61)
ACCENT  = (229, 95,  10)
WHITE   = (255, 255, 255)
CREAM   = (247, 246, 242)

servicios = [
    ("desmalezadora",    ACCENT,         "Desmalezadora"),
    ("motosierra",       (44, 62, 80),   "Motosierra"),
    ("cortacesped",      (39, 174, 96),  "Cortacésped"),
    ("tractor",          (41, 128, 185), "Tractor"),
    ("sopladora",        (142, 68, 173), "Sopladora"),
    ("fumigadora",       (39, 174, 96),  "Fumigadora"),
    ("generador",        ACCENT,         "Generador"),
    ("motobomba",        (41, 128, 185), "Motobomba"),
    ("motor_estacionario",(44,62,80),    "Motor Est."),
]

def make_placeholder(path, color, label, size=(800, 600)):
    img  = Image.new("RGB", size, color)
    draw = ImageDraw.Draw(img)
    # borde sutil
    draw.rectangle([0, 0, size[0]-1, size[1]-1], outline=WHITE, width=3)
    # icono (círculo)
    cx, cy = size[0]//2, size[1]//2
    r = 60
    draw.ellipse([cx-r, cy-r-40, cx+r, cy+r-40], fill=WHITE)
    # texto
    try:
        font = ImageFont.truetype("arial.ttf", 36)
        font_sm = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font = font_sm = ImageFont.load_default()

    bbox = draw.textbbox((0,0), label, font=font)
    w    = bbox[2] - bbox[0]
    draw.text(((size[0]-w)//2, cy+40), label, fill=WHITE, font=font)

    bbox2 = draw.textbbox((0,0), "PowerFix", font=font_sm)
    w2 = bbox2[2] - bbox2[0]
    draw.text(((size[0]-w2)//2, size[1]-50), "PowerFix", fill=(255,255,255,140), font=font_sm)

    img.save(path, "WEBP", quality=80)
    print(f"  Creado: {os.path.basename(path)}")

# Imágenes de servicios
for name, color, label in servicios:
    make_placeholder(os.path.join(PROD, f"{name}.webp"), color, label)

# Hero background
make_placeholder(
    os.path.join(OUT, "hero-bg.webp"),
    DARK, "",
    size=(1920, 1080)
)

# OG image
make_placeholder(
    os.path.join(OUT, "og-image.webp"),
    DARK, "PowerFix",
    size=(1200, 630)
)

print("OK - Imagenes generadas.")
