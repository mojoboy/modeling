"""Make site/og.jpg, the 1200x630 preview card that iMessage, Instagram DMs, LinkedIn etc. show for the link.

    .venv/Scripts/python scripts/make_share_image.py img_1785

Name on the left, the chosen photo on the right. Uses Windows' Impact and Consolas as stand-ins for the
site's Anton and Plex Mono, so it needs no font downloads.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
W, H = 1200, 630
BG, INK, INK2, ORANGE, POOL = '#0E0D0C', '#F5F1E8', '#ADA699', '#FF5B1F', '#38D3C8'
FONTS = Path('C:/Windows/Fonts')


def main(media_id):
    card = Image.new('RGB', (W, H), BG)

    # warm glow bottom-left, like the hero
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-380, 300, 520, 1100), fill=120)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    card.paste(Image.new('RGB', (W, H), ORANGE), (0, 0), glow)

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
    d.rounded_rectangle((px - 4, py + 26, px + 128, py + 62), radius=18, fill=POOL)
    d.text((px + 12, py + 33), '@mb.dayy', font=ImageFont.truetype(str(FONTS / 'consolab.ttf'), 21), fill=BG)

    big = ImageFont.truetype(str(FONTS / 'impact.ttf'), 150)
    d.text((70, 120), 'DAVID', font=big, fill=INK)
    d.text((70, 275), 'BABAFEMI', font=big, fill=None, stroke_width=2, stroke_fill=INK)
    d.text((74, 470), '( MODEL · WASHINGTON, DC · NEW YORK )', font=ImageFont.truetype(str(FONTS / 'consola.ttf'), 22), fill=INK2)

    out = SITE / 'og.jpg'
    card.save(out, 'JPEG', quality=88, optimize=True)
    print(f'wrote {out} ({out.stat().st_size // 1000} KB)')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'img_1785')
