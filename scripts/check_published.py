"""Fail if anything in site/ could leak where or when a photo was taken. Runs before every deploy.

    python scripts/check_published.py

Photos (JPG/WebP/PNG): no EXIF at all (that's where phones put GPS, camera and time).
Videos (MP4/MOV): no Apple location tags (the ©xyz atom or com.apple.quicktime.location.*).
Originals belong in incoming/, which is never published.
"""
import sys
from pathlib import Path

from PIL import Image

SITE = Path(__file__).resolve().parents[1] / 'site'
VIDEO_TAGS = (b'\xa9xyz', b'com.apple.quicktime.location', b'com.apple.quicktime.creationdate')


def problems():
    for f in sorted(SITE.rglob('*')):
        ext = f.suffix.lower()
        if ext in ('.jpg', '.jpeg', '.webp', '.png'):
            with Image.open(f) as im:
                if im.getexif() or im.info.get('exif'):
                    yield f'{f.relative_to(SITE)}: photo still has EXIF data'
        elif ext in ('.mp4', '.mov', '.m4v'):
            data = f.read_bytes()
            for tag in VIDEO_TAGS:
                if tag in data:
                    yield f'{f.relative_to(SITE)}: video still has {tag.decode("latin-1")}'
        elif ext in ('.heic', '.heif'):
            yield f'{f.relative_to(SITE)}: phone original in site/ (run prepare_media.py instead)'


if __name__ == '__main__':
    found = list(problems())
    for p in found:
        print('FAIL', p)
    checked = sum(1 for f in SITE.rglob('*') if f.is_file())
    print(f'{checked} files checked, {len(found)} problems')
    sys.exit(1 if found else 0)
