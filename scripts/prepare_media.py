"""Turn phone photos and videos into web-ready files with no hidden data.

    .venv/Scripts/python scripts/prepare_media.py

Reads incoming/ (originals, never published) and writes site/media/:
  photos (HEIC/JPG/PNG) -> upright, 2000 px long side, WebP + a JPG fallback, no metadata (GPS, camera, date)
  videos (MOV/MP4)      -> H.264 MP4 that every browser plays, 1080 px long side, no audio, no metadata,
                           plus a poster frame (the still shown before the video loads)
Prints each file's size and checks the outputs really have no location data.
"""
import json
import subprocess
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()   # lets Pillow open iPhone HEIC photos
ROOT = Path(__file__).resolve().parents[1]
INCOMING, OUT = ROOT / 'incoming', ROOT / 'site' / 'media'
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
PHOTO, VIDEO = {'.heic', '.jpg', '.jpeg', '.png'}, {'.mov', '.mp4', '.m4v'}


def photo(src):
    with Image.open(src) as im:
        had_gps = bool(im.getexif().get_ifd(0x8825))
        img = ImageOps.exif_transpose(im).convert('RGB')
    img.thumbnail((2000, 2000), Image.LANCZOS)
    stem = src.stem.split('-', 1)[-1].lower()
    q = 92 if img.width < 1000 else 82   # tight crops have few pixels to spare, so compress them gently
    img.save(OUT / f'{stem}.webp', 'WEBP', quality=q, method=6)
    img.save(OUT / f'{stem}.jpg', 'JPEG', quality=85, optimize=True)
    small = img.copy()
    small.thumbnail((900, 900), Image.LANCZOS)   # for grids and the scrolling strip; the full size opens on click
    small.save(OUT / f'{stem}-sm.webp', 'WEBP', quality=max(q - 2, 80), method=6)
    for f in (OUT / f'{stem}.webp', OUT / f'{stem}.jpg', OUT / f'{stem}-sm.webp'):
        with Image.open(f) as check:
            assert not check.getexif() and not check.info.get('exif'), f'{f.name} still has metadata'
    return dict(type='photo', src=f'media/{stem}.webp', small=f'media/{stem}-sm.webp', fallback=f'media/{stem}.jpg',
                w=img.width, h=img.height,
                note=f"{src.stat().st_size / 1e6:.1f} MB -> {(OUT / f'{stem}.webp').stat().st_size / 1e3:.0f} KB webp"
                     f"{', GPS removed' if had_gps else ''}")


def video(src):
    stem = src.stem.split('-', 1)[-1].lower()
    mp4, poster = OUT / f'{stem}.mp4', OUT / f'{stem}-poster.jpg'
    scale = "scale='if(gt(iw,ih),min(1080,iw),-2)':'if(gt(iw,ih),-2,min(1080,ih))'"
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', str(src), '-map_metadata', '-1', '-map_chapters', '-1',
                    '-vf', scale, '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
                    '-an', '-movflags', '+faststart', str(mp4)], check=True)
    subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-ss', '0.5', '-i', str(mp4), '-frames:v', '1', '-q:v', '3',
                    str(poster)], check=True)
    probe = subprocess.run([FFMPEG, '-i', str(mp4)], capture_output=True, text=True).stderr
    assert 'location' not in probe.lower(), f'{mp4.name} still has a location tag'
    with Image.open(poster) as p:
        w, h = p.size
    dur = next((line.split('Duration:')[1].split(',')[0].strip() for line in probe.splitlines() if 'Duration:' in line), '?')
    return dict(type='video', src=f'media/{stem}.mp4', poster=f'media/{stem}-poster.jpg', w=w, h=h,
                note=f'{src.stat().st_size / 1e6:.1f} MB -> {mp4.stat().st_size / 1e6:.1f} MB mp4, {dur}, no audio')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = []
    for src in sorted(INCOMING.iterdir()):
        ext = src.suffix.lower()
        if ext in PHOTO:
            items.append(dict(file=src.name, **photo(src)))
        elif ext in VIDEO:
            items.append(dict(file=src.name, **video(src)))
    for it in items:
        print(f"{it['file']}: {it['type']} {it['w']}x{it['h']} | {it['note']}")
    # The site only needs the web paths; the original filenames and size notes stay out of the published file
    public = [{k: v for k, v in it.items() if k not in ('file', 'note')} | {'id': Path(it['src']).stem}
              for it in items]
    (ROOT / 'site' / 'media.json').write_text(json.dumps(public, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
