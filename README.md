# Through the Lens — A Visual Story of 57,000 Frames

**Through the Lens** is a data visualization project created for EPFL's [COM-480 Data Visualization](https://com-480.github.io/) course. It explores four years of personal photography through EXIF metadata exported from Lightroom — uncovering temporal patterns, gear evolution, exposure habits, and workflow across ~56,890 photos.

**Website:** https://com-480-data-visualization.github.io/through_the_lens/

**Team:** Lea Grieder, Adrien Buttier, Martina Gatti

---

## Repository Structure

```
plot_twisters/
├── data/                       # all data assets (see data/README.md)
│   ├── metadata/               # source CSV — not committed, download required
│   ├── generated/              # auto-generated JS data files
│   ├── hero-gallery/           # thumbnails for the intro mosaic
│   └── sankey-previews/        # images for the workflow funnel section
├── scripts/                    # data processing scripts
│   ├── extract_chart_data.py   # generates data/generated/chart_data.js
│   └── build_hero_gallery.py   # generates data/hero-gallery/
├── milestone_1/                # project proposal and exploratory analysis
├── milestone_2/                # website draft and visualization concepts
├── milestone_3/                # process book
├── index.html                  # main website (single-page)
└── requirements.txt            # Python dependencies
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/com-480-data-visualization/through_the_lens.git
cd through_the_lens
```

### 2. Download the dataset

The source dataset (`photos.csv`) is not committed to the repository due to its size (192 MB). Download it from Google Drive and place it at `data/metadata/photos.csv`:

[Download photos.csv](https://drive.google.com/drive/folders/13Vj7DCE1lWUc6e9tgYaZV9_f0R77TpIG?usp=sharing)

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Generate the chart data

```bash
python scripts/extract_chart_data.py
```

This reads `data/metadata/photos.csv` and writes `data/generated/chart_data.js`, which is loaded by `index.html`.

### 5. Run the website locally

The website requires a local HTTP server (a direct `file://` open will not load assets correctly):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## Milestones

| Milestone | Description |
|-----------|-------------|
| `milestone_1/` | Project proposal — initial concept, dataset description, research questions, exploratory analysis |
| `milestone_2/` | Website draft — visualization concepts, design decisions, and first prototype |
| `milestone_3/` | Final delivery — process book (`process_book.html`) |
