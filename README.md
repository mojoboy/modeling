# David Babafemi · model portfolio

A static site (no build step): `site/index.html`, `site/css/style.css`, `site/js/main.js`.

## Adding a new shoot

1. Drop the phone originals (HEIC, JPG, PNG, MOV, MP4) into `incoming/`. That folder is never published.
2. Run `.venv/Scripts/python scripts/prepare_media.py`. It makes web copies in `site/media/` with all hidden
   data removed (GPS location, camera, dates), and lists them in `site/media.json`.
3. In `site/js/content.js`, add the shoot to the top of `SHOOTS`: a title, the year, tags, a one-line note,
   its accent color and the media ids (file names without the extension, e.g. `img_1781`).
   Remove one of the `IN_EDIT` placeholder cards if this shoot was one of them.

Any shape works (tall, wide, square, photo or clip): the grid keeps each piece's own proportions.

## Filling in details

`site/js/content.js` holds every word on the page: bio, tagline, measurements (`STATS`; empty ones stay hidden),
a booking email (`PROFILE.email`, hidden until set) and the clip shown in the hero (`PROFILE.heroClip`).

## Preview

Serve the `site/` folder with any static server, e.g. `python -m http.server -d site 8010`.
