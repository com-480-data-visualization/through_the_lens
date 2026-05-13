# Process Book Notes — Through the Lens
*Lea Grieder — COM-480 Data Visualization, EPFL MA4*
*Use this file as raw material to write the final process book PDF (max 8 pages).*
*Replace [FILL IN] markers and [ADD SKETCH/SCREENSHOT] placeholders before exporting.*

---

## 1. Project Overview

**"Through the Lens"** explores four years of personal photography (~56,890 photos, 2021–2025)
through EXIF metadata exported from Lightroom. The goal is to reveal patterns in how, when,
and with what gear photos were taken — patterns that are invisible when browsing photos
individually but become clear at scale.

**Target audience:** Photographers and data-curious people who want to understand their own
shooting habits. The story is personal, which makes it engaging even to non-technical visitors.

**Dataset:** Lightroom EXIF export — 56,890 rows, 322 columns including ISO, aperture,
shutter speed, focal length, camera model, lens, GPS coordinates, Lightroom editing
parameters (Clarity, Dehaze, Shadows), and selection/publish flags. Data spans Sep 2021–May 2026,
with 2022–2025 being the four complete years.

---

## 2. From Idea to Prototype (MS1 → MS2)

### Original vision (MS1)
[FILL IN: Summarise what your MS1 report described as the goal and planned visualisations.
Add the MS1 sketches here as images.]

[ADD MS1 SKETCH — overview layout / planned sections]

The MS1 sketches proposed [FILL IN: which visualisations were planned]. The core idea was
to build a scrollable narrative page where each section answers a different question about
the photography practice.

### What was built for MS2
MS2 delivered the basic skeleton of the site with working prototypes of:
- **Photo Activity** — annual bar chart + clickable daily heatmap
- **Exposure Explorer** — scatter plot (initially with linear axes)
- **Gear Race / Lens Race** — animated bar charts of cumulative shots per camera/lens
- **Sankey diagram** — photo workflow funnel (shots → selection → edition → published)

[ADD MS2 SCREENSHOT — the state of the site at MS2 submission]

The MS2 prototype proved the concept but had several known weaknesses that MS3 addressed
(see below).

---

## 3. Design Evolution (MS2 → MS3)

### 3.1 Exposure Explorer — the biggest iteration

The Exposure Explorer was the visualisation that changed most between MS2 and MS3.

**Problem 1: Linear axes made the data look like noise.**
Photographic exposure values are geometric, not linear — each f-stop doubles the light;
each ISO stop doubles sensor sensitivity. On a linear axis, all the interesting variation
is compressed into a corner and the scatter looks like a formless blob.

*Fix:* Replaced all four axes with perceptually correct log scales:
- Aperture: `log₂(f) / log₂(22)` — maps f/1.4 → f/22 with equal visual stops
- Shutter: `log(v × 4000) / log(8000)` — covers 1/4000 s to 2 s
- ISO: `log₂(iso/100) / log₂(256)` — 100 to 25600
- Focal length: `log₂(focal/14) / log₂(200/14)` — 14 mm to 200 mm

[ADD SCREENSHOT — before (linear) vs after (log) axes on the same ISO vs aperture view]

**Problem 2: The "negative correlation" annotation was misleading.**
The original chart drew an arrow and label ("negative correlation" / "positive correlation")
derived from a Pearson r calculation on raw values. On log scales the geometry changes, so
the label sometimes contradicted what the user saw on screen. It also told users *what* to
conclude rather than letting them discover it.

*Fix:* Removed the annotation entirely. Replaced it with a **binned median trend line**
(12 bins on the X axis, median Y per bin, Catmull-Rom spline). The trend line shows the
pattern without prescribing its interpretation, is robust to outliers, and works correctly
on any axis combination.

**Problem 3: The "Scene type" colour dimension was circular.**
Scene type was derived from ISO value (`< 800 = outdoor, ≥ 800 = indoor`), then used as a
colour on a chart whose X or Y axis was often ISO. This created a tautological display where
the colour encoded exactly what the axis already showed.

*Fix:* Replaced with **Focal range** (Wide < 35 mm / Normal 35–85 mm / Tele > 85 mm) — a
genuinely independent variable that reveals gear-usage patterns across all axis combinations.

**Addition 1: D3 brush selection with live statistics.**
The scatter plot has ~2000 points; hovering one at a time is not enough to see patterns in
a region. A D3 brush lets users drag to select a cluster and immediately see aggregated
statistics: count, median ISO/aperture/shutter/focal, camera breakdown, year breakdown.

Design detail: unselected dots dim to 7% opacity so the selection stands out clearly; a
"Drag to select photos" affordance badge pulses until first use then disappears.

[ADD SCREENSHOT — brush selection active with stats panel visible]

**Addition 2: Zoom into selection.**
After releasing a brush, the plot zooms in: spring-physics animation flies all dots to
new positions filling the full canvas, and the axes update to show only the tick marks
within the zoomed range. This separates the selected cluster and makes individual point
positions readable, revealing sub-patterns within the selection.

*Technical challenge:* D3 dispatches brush `end` synchronously when `.move(null)` is called,
causing a re-entrant handler call that cleared the selection before the "← Zoom out" button
could render. Fixed by setting the zoom flag *before* any programmatic brush move, and
guarding the handler with an early return when already zoomed.

[ADD SCREENSHOT — zoomed-in view with "ZOOMED IN" badge and "← Zoom out" button]

---

### 3.2 Sankey Diagram

[FILL IN: Describe what the Sankey looked like at MS2 and what changed.
Adrien or Martina may have more context here.]

The Sankey was migrated to D3 layout rendering during MS3, but this introduced label
overlap and visual inconsistencies. The final version reverted to the original manual
layout (precise control over node/link positions) while keeping D3 for rendering.

Key editorial decision: the "published" stage (500 photos) is a user-provided estimate,
not derived from metadata — the dataset does not record which photos were published.
This is worth stating clearly in the process book as a data limitation.

---

### 3.3 Data Range Homogenisation

At MS2, three of the five visualisations (Exposure Explorer, Gear Race, Lens Race) were
capped at 2024, while the Activity section already showed 2021–2026. This created an
inconsistent narrative where 2025 — a full year with 11,497 photos — simply vanished
from most of the site.

*Fix:* Extended all visualisations to 2025. 2026 (169 photos, partial year) is kept only
in the Activity/Heatmap sections where it provides useful context about the dataset boundary.

---

## 4. Challenges Summary

| Challenge | What we tried | What worked |
|-----------|--------------|-------------|
| Exposure axes look like blobs | Linear → log scales | Log scales with photographic tick marks |
| Annotation contradicted the visual | Pearson r label | Remove label, add median trend line |
| Circular colour encoding | Scene type (derived from ISO) | Focal range (independent variable) |
| 2000 points hard to read | Hover tooltips only | D3 brush + zoom-into-selection |
| Brush zoom-out button disappeared | — | Guard re-entrant D3 brush event with zoom flag |
| Inconsistent year ranges | — | Re-run data extraction with unified 2021–2025 filter |
| Sankey label overlap with D3 layout | D3 Sankey layout | Revert to manual layout + D3 rendering |

---

## 5. What We Kept from MS2 (and Why)

- **Spring-physics animation** for the scatter plot dots — the kinetic feel makes axis
  changes engaging rather than abrupt. Kept and extended to power the zoom animation.
- **Canvas + SVG hybrid** — Canvas for animated dots (performance), SVG overlay for
  D3 axes/brush (interactivity). This pattern scales well and was the right call from MS2.
- **Scrollable single-page layout** — keeps the narrative linear without navigation overhead.

---

## 6. Peer Contribution Breakdown

*Fill this in as a team before submission. Be honest — graders read it carefully.*

| Section | Lea | Adrien | Martina |
|---------|-----|--------|---------|
| Exposure Explorer (axes, trend, colour) | ✓ | | |
| D3 brush selection | ✓ | | |
| Zoom-into-selection | ✓ | | |
| Sankey diagram | partial (conflict resolution) | [FILL] | [FILL] |
| Gear Race / Lens Race | | [FILL] | [FILL] |
| Photo Activity / Heatmap | | [FILL] | [FILL] |
| Data extraction (`extract_viz_data.py`) | ✓ (year fix) | [FILL] | [FILL] |
| Site layout / CSS | [FILL] | [FILL] | [FILL] |
| Process book | ✓ (this) | [FILL] | [FILL] |
| Screencast | [FILL] | [FILL] | [FILL] |

---

## 7. Things to Add to the Final PDF

- [ ] MS1 sketches (scan or screenshot from the MS1 report)
- [ ] Screenshot: Exposure Explorer before log scales (linear axes)
- [ ] Screenshot: Exposure Explorer after log scales
- [ ] Screenshot: brush selection with stats panel
- [ ] Screenshot: zoomed-in view
- [ ] Screenshot: full site overview (hero → Sankey scroll)
- [ ] Fill in Adrien and Martina's contributions above
- [ ] Write a brief "Related work / inspiration" paragraph (what visualisations inspired the design?)
- [ ] One paragraph on the data story: what did you personally learn about your photography?
