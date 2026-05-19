#!/usr/bin/env python3
"""Build web thumbnails + manifest for hero mosaic from EPFL shutterstock JPGs."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from PIL import Image, ExifTags
except ImportError:
    print("Install Pillow: pip install Pillow", file=sys.stderr)
    sys.exit(1)

DEFAULT_SRC = Path("/Volumes/PHOTO_BACKUP/EPFL shutterstock/jpg small")
REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "data" / "hero-gallery"
THUMB_DIR = OUT_DIR / "thumb"
MANIFEST_PATH = OUT_DIR / "manifest.json"

SOURCE_PATTERN = re.compile(r"^EPFL shutterstock-(\d+)\.jpg$", re.IGNORECASE)

# EXIF tag ids (Pillow uses numeric keys in getexif())
EXIF_DATETIME_ORIGINAL = 0x9003
EXIF_DATETIME = 0x0132
EXIF_CREATE_DATE_NAMES = {"DateTimeOriginal", "DateTime", "CreateDate"}


def parse_exif_datetime(raw: str | bytes | None) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace").strip("\x00")
    else:
        raw = str(raw).strip()
    if not raw or raw in ("0000:00:00 00:00:00", "0000-00-00 00:00:00"):
        return None
    for fmt in ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue
    return None


def exif_capture_datetime(img: Image.Image) -> datetime | None:
    exif = img.getexif()
    if not exif:
        return None

    # Direct known tags
    for tag_id in (EXIF_DATETIME_ORIGINAL, EXIF_DATETIME):
        dt = parse_exif_datetime(exif.get(tag_id))
        if dt:
            return dt

    # Named tags via ExifTags
    tag_map = {ExifTags.TAGS.get(k, str(k)): k for k in exif}
    for name in EXIF_CREATE_DATE_NAMES:
        if name in tag_map:
            dt = parse_exif_datetime(exif.get(tag_map[name]))
            if dt:
                return dt

    # Exif IFD sub-tags
    try:
        ifd = exif.get_ifd(0x8769)
        for tag_id in (EXIF_DATETIME_ORIGINAL, EXIF_DATETIME):
            dt = parse_exif_datetime(ifd.get(tag_id))
            if dt:
                return dt
    except Exception:
        pass

    return None


def capture_info(src: Path) -> tuple[str | None, str | None, str]:
    try:
        with Image.open(src) as img:
            dt = exif_capture_datetime(img)
            if dt:
                captured_at = dt.strftime("%Y-%m-%dT%H:%M:%S")
                return captured_at, dt.strftime("%Y-%m-%d"), "exif"
    except Exception:
        pass

    try:
        mtime = src.stat().st_mtime
        dt = datetime.fromtimestamp(mtime)
        captured_at = dt.strftime("%Y-%m-%dT%H:%M:%S")
        return captured_at, dt.strftime("%Y-%m-%d"), "file_mtime"
    except OSError:
        return None, None, "missing"


def resize_max_side(img: Image.Image, max_side: int) -> Image.Image:
    w, h = img.size
    if max(w, h) <= max_side:
        return img.copy()
    if w >= h:
        nw, nh = max_side, round(h * max_side / w)
    else:
        nw, nh = round(w * max_side / h), max_side
    return img.resize((nw, nh), Image.Resampling.LANCZOS)


def build_item(
    src: Path,
    photo_id: str,
    max_side: int,
    quality: int,
    dry_run: bool,
) -> dict:
    slug = f"epfl-{photo_id}"
    thumb_rel = f"data/hero-gallery/thumb/{slug}.webp"
    thumb_path = THUMB_DIR / f"{slug}.webp"

    captured_at, captured_date, date_source = capture_info(src)

    width = height = 0
    if not dry_run:
        with Image.open(src) as img:
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            thumb = resize_max_side(img, max_side)
            width, height = thumb.size
            thumb_path.parent.mkdir(parents=True, exist_ok=True)
            thumb.save(thumb_path, "WEBP", quality=quality, method=6)
    else:
        with Image.open(src) as img:
            thumb = resize_max_side(
                img.convert("RGB") if img.mode not in ("RGB", "L") else img,
                max_side,
            )
            width, height = thumb.size

    return {
        "id": photo_id,
        "slug": slug,
        "thumb": thumb_rel,
        "width": width,
        "height": height,
        "source_file": src.name,
        "captured_at": captured_at,
        "captured_date": captured_date,
        "date_source": date_source,
    }


def sort_key(item: dict) -> tuple:
    at = item.get("captured_at")
    if at:
        return (0, at, item["id"])
    return (1, "", item["id"])


def collect_sources(src_dir: Path) -> list[tuple[str, Path]]:
    if not src_dir.is_dir():
        raise FileNotFoundError(f"Source directory not found: {src_dir}")
    found: list[tuple[str, Path]] = []
    for path in sorted(src_dir.iterdir()):
        m = SOURCE_PATTERN.match(path.name)
        if m and path.is_file():
            found.append((m.group(1).zfill(3), path))
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description="Build hero gallery thumbs + manifest")
    parser.add_argument(
        "--src",
        type=Path,
        default=Path(os.environ.get("HERO_GALLERY_SRC", DEFAULT_SRC)),
        help="Source folder with EPFL shutterstock-NNN.jpg files",
    )
    parser.add_argument("--max-side", type=int, default=400, help="Max long edge in px")
    parser.add_argument("--quality", type=int, default=82, help="WebP quality 0-100")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, no image output")
    args = parser.parse_args()

    sources = collect_sources(args.src)
    if not sources:
        print(f"No matching JPG files in {args.src}", file=sys.stderr)
        return 1

    items: list[dict] = []
    stats = {"exif": 0, "file_mtime": 0, "missing": 0}

    for photo_id, src in sources:
        item = build_item(src, photo_id, args.max_side, args.quality, args.dry_run)
        items.append(item)
        stats[item["date_source"]] = stats.get(item["date_source"], 0) + 1

    items.sort(key=sort_key)

    manifest = {
        "version": 1,
        "source_dir": str(args.src),
        "max_side_px": args.max_side,
        "webp_quality": args.quality,
        "count": len(items),
        "items": items,
    }

    if not args.dry_run:
        THUMB_DIR.mkdir(parents=True, exist_ok=True)
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    total_bytes = 0
    if not args.dry_run and THUMB_DIR.exists():
        for p in THUMB_DIR.glob("*.webp"):
            total_bytes += p.stat().st_size

    print(f"Processed {len(items)} images from {args.src}")
    print(f"  date_source: exif={stats.get('exif', 0)}, file_mtime={stats.get('file_mtime', 0)}, missing={stats.get('missing', 0)}")
    if args.dry_run:
        print("  (dry-run — no files written)")
    else:
        print(f"  thumbs: {THUMB_DIR} ({total_bytes / 1024:.0f} KiB total)")
        print(f"  manifest: {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
