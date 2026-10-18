"""Make site/og.jpg, the 1200x630 preview card that iMessage, Instagram DMs, LinkedIn etc. show for the link.

    .venv/Scripts/python scripts/make_share_image.py duo_bags

Name on the left, the chosen photo on the right. Uses Windows' Georgia and Arial as stand-ins for the
site's Bodoni Moda and Jost, so it needs no font downloads.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
W, H = 1200, 630
BG, INK, INK2, ACCENT, ACCENT2 = '#100F0E', '#ECE7DD', '#A39D92', '#C9B79C', '#9C9488'
FONTS = Path('C:/Windows/Fonts')


def main(media_id):
    card = Image.new('RGB', (W, H), BG)

    # warm glow bottom-left, like the hero
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-380, 300, 520, 1100), fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    card.paste(Image.new('RGB', (W, H), ACCENT), (0, 0), glow)

    # photo, cropped to a tall card on the right with rounded corners
    pw, ph = 380, 530
    with Image.open(SITE / 'media' / f'{media_id}.jpg') as src:
        scale = max(pw / src.width, ph / src.height)
        im = src.resize((round(src.width * scale), round(src.height * scale)), Image.LANCZOS)
    left = (im.width - pw) // 2
    im = im.crop((left, 0, left + pw, ph))
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=22, fill=255)
    px, py = W - pw - 70, (H - ph) // 2
    card.paste(im, (px, py), mask)

    d = ImageDraw.Draw(card)
    d.rounded_rectangle((px - 4, py + 26, px + 128, py + 62), radius=18, fill=ACCENT2)
    d.text((px + 12, py + 33), '@mb.dayy', font=ImageFont.truetype(str(FONTS / 'arialbd.ttf'), 21), fill=BG)

    big = ImageFont.truetype(str(FONTS / 'georgia.ttf'), 112)
    d.text((70, 130), 'DAVID', font=big, fill=INK)
    d.text((70, 280), 'BABAFEMI', font=ImageFont.truetype(str(FONTS / 'georgiai.ttf'), 112), fill=ACCENT)
    d.text((74, 470), 'MODEL  ·  WASHINGTON, DC  ·  NEW YORK', font=ImageFont.truetype(str(FONTS / 'arial.ttf'), 22), fill=INK2)

    out = SITE / 'og.jpg'
    card.save(out, 'JPEG', quality=88, optimize=True)
    print(f'wrote {out} ({out.stat().st_size // 1000} KB)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'img_1785')
