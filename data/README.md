# Data

This folder contains all assets used by the website. Below is an overview of what each folder contains and how it fits into the project.

```
data/
├── metadata/
│   └── photos.csv          # not committed — download from Google Drive
├── generated/
│   └── chart_data.js       # auto-generated
├── hero-gallery/
│   ├── thumb/              # 124 WebP thumbnails
│   ├── manifest.json
│   └── gallery-data.js
└── sankey-previews/
    ├── before_edit-XX.jpg
    ├── after_edit-XX.jpg
    ├── lost-XX.jpg
    └── published-XX.jpg
```

---

## `metadata/`

Contains the source dataset that powers all charts and visualizations on the site.

- **`photos.csv`** — one row per photo, with EXIF metadata (camera model, focal length, aperture, date, etc.) and Lightroom editing data. This file is **not committed** to the repository due to its size (192 MB).

  Download it from Google Drive: https://drive.google.com/drive/folders/13Vj7DCE1lWUc6e9tgYaZV9_f0R77TpIG?usp=sharing

  Once downloaded, place it at `data/metadata/photos.csv`, then run the extraction script to regenerate the chart data:

  ```bash
  python scripts/extract_chart_data.py
  ```

---

## `generated/`

Contains files produced by scripts.

- **`chart_data.js`** — generated from `metadata/photos.csv` by `scripts/extract_chart_data.py`. Exposes the JavaScript globals (`CAMERAS`, `CAM_COLS`, `GEAR_MONTHLY`) that are loaded by `index.html` to render the charts.

---

## `hero-gallery/`

Assets for the animated photo mosaic shown in the intro section of the site.

- **`thumb/`** — 124 WebP thumbnails displayed in the mosaic background.
- **`manifest.json`** — list of thumbnails with metadata used to lay out the mosaic.
- **`gallery-data.js`** — precomputed gallery data loaded by `index.html`.

To regenerate this gallery from a new set of source photos:
```bash
python scripts/build_hero_gallery.py
```
See `hero-gallery/README.md` for details on the source folder and options.

---

## `sankey-previews/`

JPEG photos illustrating the workflow Sankey diagram section. Each file corresponds to a step in the photo editing workflow:

- `before_edit-XX.jpg` — raw shots before editing
- `after_edit-XX.jpg` — photos after editing
- `lost-XX.jpg` — photos that were culled
- `published-XX.jpg` — final published photo
