# Through the Lens: A Visual Story of 57,000 Frames

**Through the Lens** is a data visualization project created for EPFL's [COM-480 Data Visualization](https://com-480.github.io/) course. It explores four years of personal photography through EXIF metadata exported from Lightroom, uncovering temporal patterns, gear evolution, exposure habits, and workflow across ~56,890 photos.

**Website:** https://com-480-data-visualization.github.io/through_the_lens/

**Team:** Lea Grieder, Adrien Buttier, Martina Gatti

**Process book:** [`milestone_3/process_book.pdf`](milestone_3/process_book.pdf)

**Screencast:** [`Screencast.mov`](Screencast.mov)

---

## Dataset

~56,890 photos (2022–2026), one row per shot with EXIF + Lightroom metadata (camera, lens, ISO, aperture, shutter, focal length, capture date).

---

## Repository Structure

```
through_the_lens/
├── data/                       # all data assets (see data/README.md)
│   ├── metadata/               # source CSV (not committed, download required)
│   ├── generated/              # auto-generated JS data files
│   ├── hero-gallery/           # thumbnails for the intro mosaic
│   └── sankey-previews/        # images for the workflow funnel section
├── scripts/                    # data processing scripts
│   ├── extract_chart_data.py   # generates data/generated/chart_data.js
│   └── build_hero_gallery.py   # generates data/hero-gallery/
├── js/                         # website JavaScript, split by visualization
├── milestone_1/                # project proposal and exploratory analysis
├── milestone_2/                # website draft and visualization concepts
├── milestone_3/                # process book
├── index.html                  # main website (loads js/ modules)
└── requirements.txt            # Python dependencies
```

---

## Getting Started

Running the website needs only the two steps below: the processed data it reads (`data/generated/chart_data.js`), the hero gallery, and the workflow previews are all committed to the repository. The raw dataset and Python tooling are **only** required if you want to regenerate that data (see "Regenerating the data" below).

### 1. Clone the repository

```bash
git clone https://github.com/com-480-data-visualization/through_the_lens.git
cd through_the_lens
```

### 2. Run the website locally

The website requires a local HTTP server (a direct `file://` open will not load assets correctly):

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## Regenerating the data (optional)

The site ships with pre-computed data, so these steps are **not** needed to view it. Follow them only to rebuild `data/generated/chart_data.js` from the raw export (e.g. after adding new photos).

### 1. Download the dataset

The source dataset (`photos.csv`) is not committed to the repository due to its size (192 MB). Download it from Google Drive and place it at `data/metadata/photos.csv`:

[Download photos.csv](https://drive.google.com/drive/folders/13Vj7DCE1lWUc6e9tgYaZV9_f0R77TpIG?usp=sharing)

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Generate the chart data

```bash
python scripts/extract_chart_data.py
```

This reads `data/metadata/photos.csv` and writes `data/generated/chart_data.js`, which is loaded by `index.html`.

---

## Visualizations

| Section | Question it answers |
|---------|--------------------|
| Photo Activity | When does Adrien shoot, and does the rhythm repeat across years? |
| Gear Timeline | Which camera was active when, and how abrupt were transitions? |
| Lens Race | How did lens usage shift over time? |
| Exposure Explorer | What exposure choices does Adrien make, and do they cluster? |
| Workflow Funnel | Of 57k frames captured, how many survived to publication? |

---

## Milestones

| Milestone | Description |
|-----------|-------------|
| `milestone_1/` | Project proposal: initial concept, dataset description, research questions, exploratory analysis |
| `milestone_2/` | Website draft: visualization concepts, design decisions, and first prototype |
| `milestone_3/` | Final delivery: process book |
