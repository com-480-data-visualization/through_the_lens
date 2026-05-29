# Hero Gallery

This folder contains the assets for the animated photo mosaic shown in the intro section of the site.

```
hero-gallery/
├── thumb/                  # 124 WebP thumbnails (~400px on the longest side)
│   └── epfl-NNN.webp
├── manifest.json           # index of all photos with metadata
└── gallery-data.js         # precomputed gallery data loaded by index.html
```

---

## `manifest.json`

Lists all 124 photos with the following fields:

- `id`, `slug`, `thumb`, `width`, `height`, `source_file`
- `captured_at` — full timestamp (`2024-05-03T18:42:10`)
- `captured_date` — date only (`2024-05-03`)
- `date_source` — `exif` | `file_mtime` | `missing`

Items are sorted by `captured_at` ascending.

---

## Regenerating the gallery

Mount the backup volume, then from the repo root:

```bash
python scripts/build_hero_gallery.py
```

Default source: `/Volumes/PHOTO_BACKUP/EPFL shutterstock/jpg small`

To use a different source folder:
```bash
HERO_GALLERY_SRC=/path/to/jpg python scripts/build_hero_gallery.py
```

Available options: `--dry-run`, `--max-side 400`, `--quality 82`
