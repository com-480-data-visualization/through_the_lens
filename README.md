# Through the Lens — A Visual Story of 57,000 Frames

## Project Overview

**Through the Lens** is a data visualization project created for EPFL's [COM-480 Data Visualization](https://com-480.github.io/) course. It explores four years of personal photography through EXIF metadata exported from Lightroom — uncovering temporal patterns, gear evolution, exposure habits, and creative editing tendencies across ~56,890 photos.

**Website:** https://com-480-data-visualization.github.io/through_the_lens/

**Team:** Lea Grieder, Adrien Buttier, Martina Gatti

---

## Project Milestones

### Milestone 3 — Final Delivery *(in progress)*
Interactive website live with full visualizations. Source code in this repository; process book and screencast to follow.

### Milestone 2 — Exploratory Analysis
Full EDA completed: temporal patterns, exposure statistics, gear usage, and Lightroom editing behavior. Plots saved to `plots/`.

### Milestone 1 — Project Proposal
[Milestone 1 PDF](Milestone_1___Data_Visualization.pdf) — initial concept, dataset description, and research questions.

---

## Data

The dataset is ~56,890 rows of EXIF + Lightroom metadata exported from Adobe Lightroom, enriched with per-photo RGB histograms (before/after edit). Data files are not tracked in git due to size.

| File | Description |
|------|-------------|
| `data/photos_metadatas_filtered.csv` | Primary dataset — EXIF fields, camera/lens, Lightroom develop settings |
| `data/photos_metadatas_with_hist_rgb128.parquet` | RGB histograms (128 bins/channel × before/after edit), joined via `DocumentID` |

---

## Research Questions

- How did shooting habits (time of day, season, frequency) evolve over four years?
- Which camera bodies and lenses were used most, and when did gear transitions happen?
- What exposure triangle choices (ISO, aperture, shutter) are most common, and do they cluster by camera or scene type?
- How aggressively are photos edited in Lightroom, and has that style changed over time?

---

## Visualizations

| Section | Description |
|---------|-------------|
| **Exposure Explorer** | Interactive scatter plot — choose any two axes from ISO, aperture, shutter speed, focal length; color by year, camera, or scene type |
| **Gear Race** | Animated bar chart of cumulative shots per camera body over time, with a playable timeline slider |

---

## Setup

Requires [Conda](https://docs.conda.io/en/latest/):

```bash
git clone https://github.com/com-480-data-visualization/through_the_lens.git
cd through_the_lens
conda env create -f environment.yml
conda activate data-viz
jupyter notebook data_exploration.ipynb
```

To view the interactive visualization locally:
```bash
open index.html
```
