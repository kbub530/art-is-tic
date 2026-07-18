#!/usr/bin/env python3
"""
ART IS TIC — the build robot.

GitHub runs this automatically every time anything in the repository
changes. You never run it yourself, and you never edit it to add photos.

What it does, in order:

  1. Looks inside the  photos/  folder. Every sub-folder is a collection
     (photos/abstract/, photos/portraits/, ...). Every image inside a
     sub-folder is a photo on the site.
  2. Makes two web-sized copies of each photo — a small one for the
     grid, a bigger one for the lightbox — so the site loads fast.
     (Your originals in photos/ are never touched or changed.)
  3. Reads captions.txt, if you've written any captions there.
  4. Writes manifest.json — the list the website reads.
  5. Puts the finished site in a folder called _site, which GitHub
     then publishes.
"""

import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).parent
PHOTOS = ROOT / "photos"
OUT = ROOT / "_site"

# Files copied straight into the published site (skipped if absent).
SITE_FILES = ["index.html", "styles.css", "script.js", "favicon.svg",
              "CNAME", "404.html", "robots.txt"]

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
THUMB_EDGE = 900     # longest side, px — grid images
LARGE_EDGE = 2000    # longest side, px — lightbox images
QUALITY = 85

try:
    RESAMPLE = Image.Resampling.LANCZOS
except AttributeError:      # very old Pillow
    RESAMPLE = Image.LANCZOS


def pretty(stem: str) -> str:
    """'walls_01' -> 'Walls 01' — used as a fallback description."""
    return re.sub(r"[-_]+", " ", stem).strip().title()


def natkey(s: str):
    """Sort so that photo_2 comes before photo_10."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def load_captions() -> dict:
    """Read captions.txt:  collection/filename.jpg | The caption"""
    caps = {}
    f = ROOT / "captions.txt"
    if not f.exists():
        return caps
    for line in f.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "|" not in line:
            continue
        key, cap = line.split("|", 1)
        key = key.strip().removeprefix("photos/").lstrip("/")
        caps[key] = cap.strip()
    return caps


def save_resized(im: Image.Image, dest: Path, long_edge: int) -> None:
    """Save a shrunken JPEG copy (metadata is not carried over)."""
    copy = im.copy()
    copy.thumbnail((long_edge, long_edge), RESAMPLE)
    if copy.mode != "RGB":
        copy = copy.convert("RGB")
    dest.parent.mkdir(parents=True, exist_ok=True)
    copy.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()

    for name in SITE_FILES:
        src = ROOT / name
        if src.exists():
            shutil.copy2(src, OUT / name)

    captions = load_captions()
    records = []

    if not PHOTOS.exists():
        print("ERROR: there is no photos/ folder in the repository yet.")
        print("Create photos/<collection-name>/ and put images inside it.")
        sys.exit(1)

    category_dirs = sorted(
        (d for d in PHOTOS.iterdir() if d.is_dir() and not d.name.startswith(".")),
        key=lambda d: natkey(d.name),
    )

    for cat_dir in category_dirs:
        files = sorted(
            (f for f in cat_dir.iterdir()
             if f.is_file() and f.suffix.lower() in IMG_EXTS),
            key=lambda f: natkey(f.name),
        )
        for f in files:
            rel = f"{cat_dir.name}/{f.name}"
            try:
                with Image.open(f) as raw:
                    im = ImageOps.exif_transpose(raw) or raw
                    width, height = im.size
                    thumb_rel = f"thumbs/{cat_dir.name}/{f.stem}.jpg"
                    large_rel = f"large/{cat_dir.name}/{f.stem}.jpg"
                    save_resized(im, OUT / thumb_rel, THUMB_EDGE)
                    save_resized(im, OUT / large_rel, LARGE_EDGE)
            except Exception as exc:                       # noqa: BLE001
                print(f"!! Skipping {rel} — couldn't read it as an image ({exc})")
                continue

            caption = captions.get(rel, "")
            records.append({
                "file": rel,
                "category": cat_dir.name,
                "thumb": "/" + thumb_rel,
                "large": "/" + large_rel,
                "width": width,
                "height": height,
                "caption": caption,
                "alt": caption or pretty(f.stem),
            })
            print(f"   ok  {rel}  ({width}x{height})")

    if not records:
        print("ERROR: no photos were found inside photos/.")
        print("The site was NOT updated (the previous version stays online).")
        sys.exit(1)

    (OUT / "manifest.json").write_text(
        json.dumps({"photos": records}, indent=2), encoding="utf-8"
    )

    # Old links like sophiamaierphoto.com/good-walls/ quietly forward
    # to the matching collection tab on the new single page.
    for cat in sorted({r["category"] for r in records}):
        stub = OUT / cat
        stub.mkdir(exist_ok=True)
        (stub / "index.html").write_text(
            '<!doctype html><meta charset="utf-8">'
            f'<meta http-equiv="refresh" content="0; url=/#c/{cat}">'
            '<link rel="canonical" href="/">'
            f'<a href="/#c/{cat}">Continue to the gallery</a>',
            encoding="utf-8",
        )

    cats = sorted({r["category"] for r in records})
    print(f"\nBuilt {len(records)} photos across {len(cats)} collections: "
          + ", ".join(cats))


if __name__ == "__main__":
    main()
