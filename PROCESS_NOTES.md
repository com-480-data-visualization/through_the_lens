# Process Book Notes — Through the Lens
*Lea Grieder — COM-480 Data Visualization, EPFL MA4*
*Raw material for the final process book PDF (max 8 pages).*
*[ADD SCREENSHOT] markers = images to capture and insert before exporting to PDF.*

---

## 1. Project Overview

**"Through the Lens: 4 Years of Campus Life in 57k Photos"** explores 56,890 photographs
taken on the EPFL campus over four years through the EXIF and Lightroom metadata hidden
inside every image. Rather than analysing the images themselves, the project turns the
invisible technical layer into a visual narrative about campus life and creative evolution.

**Target audience:** Photographers and data-curious people who want to understand their own
shooting habits. The personal framing makes it engaging even to non-technical visitors.

**Dataset:** Lightroom EXIF export — 56,890 rows, 952 metadata fields including ISO,
aperture, shutter speed, focal length, camera model, lens, GPS, Lightroom post-processing
parameters (Clarity, Dehaze, Shadows), and selection/publish flags. Covers Sep 2021–May 2026;
2022–2025 are the four complete shooting years.

**Site structure:** Scroll-driven single page, guiding the user from broad temporal patterns
toward increasingly technical photographic detail. Live at:
`https://com-480-data-visualization.github.io/through_the_lens/`

**Color palette (established at MS2):** Light off-white background `#F8FAFC`, white cards,
orange accent `#F97316`, sequential blue data palette `#2563EB → #8B5CF6`.
Typography: Playfair Display (headings) and DM Sans (body).

---

## 2. From Idea to Prototype (MS1 → MS2)

### Original vision (MS1)
[ADD MS1 SKETCH — from `milestone 1/` folder or the MS1 PDF report]

The MS1 report established the core question: *what does four years of photography reveal
about habits, gear evolution, and creative development?* Five visualisations were planned,
each answering a different question about the dataset.

### What was built for MS2 (the baseline to compare against)

All five visualisations were prototyped by MS2:

**1 — Photo Activity** (`s-activity`)
A two-level drill-down: annual bar chart (year view) → GitHub-style calendar heatmap (day
view). Clicking a bar transitions to the heatmap for that year; clicking a day surfaces the
date, count, and session name in a side panel.
*Core MVP delivered:* animated year→day transition. *Extra idea planned:* thumbnail preview
of a representative photo from that day (partially implemented via `data/pa-previews/`).

[ADD SCREENSHOT — Figure 1 & 2 from MS2: year bar chart + day heatmap]

**2 — Gear Timeline** (`s-gear`)
Swimlane heatmap: one row per camera body, one column per month, cell intensity = shots
that month (normalised per body). Static design was chosen over an animated bar chart race
because the Sony A7 IV dominates (≈96% of shots) — a race would collapse to one bar.
The swimlane preserves the full temporal picture of all bodies.

[ADD SCREENSHOT — Figure 3 from MS2: Gear Timeline swimlane]

**3 — Exposure Explorer** (`s-exposure`) — *Lea's main visualisation*
Scatter plot placing ≈57,000 photos in a user-configurable two-axis space (ISO, aperture,
shutter speed, focal length). Points animate via spring physics when axes change. A
contextual insight card explains each axis pair in plain language.
*Color dimension at MS2:* year, camera body, or **scene type inferred from ISO level**
(< 800 = outdoor, ≥ 800 = indoor).
*Extra idea planned:* lasso selection to isolate a cluster; linked highlighting with Gear
Timeline.

[ADD SCREENSHOT — Figure 4 from MS2: Exposure Explorer scatter plot, ISO vs aperture]

**4 — Lens Race** (`s-lens`)
Animated horizontal bar chart race: top 5 interchangeable lenses by total shot count,
bars showing cumulative shots from the start of the timeline to the current month. Bars
reorder as rankings change. Play/pause and scrub slider control playback.
*Extra idea planned:* annotation overlay for key events (new lens purchase, trip).

[ADD SCREENSHOT — Figure 5 from MS2: Lens Race animated bar chart]

**5 — Workflow Sankey** (`s-sankey`)
Compact Sankey summarising the photo workflow: Picture shots → Selection → Edition →
Published, with losses at each step. Link widths proportional to counts; hover tooltips
show exact values and drop-off rates.

[ADD SCREENSHOT — Figure 6 from MS2: Workflow Sankey]

---

## 3. Design Evolution (MS2 → MS3) — Lea's contributions

### 3.1 Exposure Explorer — the visualisation that changed most

**Problem 1: The scene type colour was circular.**
"Scene type" was derived from ISO value (`< 800 = outdoor`), then used as a colour on a
chart whose X or Y axis was often ISO itself. This created a tautological encoding: the
colour told you exactly what the axis already showed. When coloured by scene type on an
ISO vs aperture plot, the colour gradient simply mirrored the X axis.

*Fix:* Replaced with **Focal range** (Wide < 35 mm / Normal 35–85 mm / Tele > 85 mm) — a
genuinely independent variable that reveals gear-usage patterns across all axis combinations
without duplicating any axis.

**Problem 2: Aperture and shutter speed axes were linear — wrong for photographic data.**
ISO was already on a log scale at MS2 (as labelled in Figure 4). Aperture and shutter speed
were linear, which meant f-stops and shutter stops were visually unequal. Photographers
think in stops (each stop = 2× the light), so a log scale is the perceptually correct choice.

*Fix:* All four axes are now log-scale with stop-aware transforms:
- Aperture: `log₂(f) / log₂(22)` — equal visual spacing from f/1.4 to f/22
- Shutter: `log(v × 4000) / log(8000)` — covers 1/4000 s to 2 s
- ISO: `log₂(iso/100) / log₂(256)` — 100 to 25600
- Focal: `log₂(focal/14) / log₂(200/14)` — 14 mm to 200 mm

[ADD SCREENSHOT — aperture axis before (linear) vs after (log), same data]

**Problem 3: The insight card annotation was prescriptive and sometimes wrong.**
The original insight card said "Strong negative correlation — shooting in the dark forces
two things simultaneously: high ISO … and wide aperture." The phrasing *told* users what
to conclude rather than letting them discover it. On top of that, the Pearson r heuristic
used to generate the annotation could mismatch the visual pattern when scales changed.

*Fix:* Kept the contextual insight card (it performs well in user testing) but removed the
"negative/positive correlation" conclusion. Added a **binned median trend line** instead:
12 equal bins on the X axis, median Y per bin, rendered as a Catmull-Rom spline. The trend
line shows the pattern empirically without prescribing its interpretation, is robust to
outliers (median vs mean), and re-computes correctly for any axis pair.

The trend line label "median" was initially a small floating text at the end of the curve —
it kept getting buried under data points. Moved it to the **chart legend** alongside the
colour entries, making it always visible.

[ADD SCREENSHOT — trend line visible in plot + legend entry]

**MS2 extra idea — Lasso selection → replaced with D3 rectangular brush + zoom**
The MS2 report listed "lasso selection to isolate a cluster" as an extra idea. A free-form
lasso is complex to implement correctly and hard to use precisely. We implemented a simpler,
more standard interaction: a **D3 rectangular brush** (drag to select a region).

The brush produces live statistics for the selected photos (count, median
ISO/aperture/shutter/focal, camera and year breakdown). After releasing the brush, the plot
**zooms into the selected region**: spring physics animates all dots to new positions filling
the full canvas, and the D3 axes update to show only the tick marks within the zoomed range.
"← Zoom out" in the stats panel springs everything back to the full view.

Design rationale for zoom: the brush alone shows *which* dots are selected but doesn't
separate them — points still overlap at 2000 dots. Zooming reveals the internal structure
of the selected cluster.

[ADD SCREENSHOT — brush selection active, stats panel visible]
[ADD SCREENSHOT — zoomed-in view with ZOOMED IN badge and ← Zoom out button]

**D3 migration** (planned at MS2, delivered at MS3)
The MS2 report noted: *"planned migration to D3.js for richer axis transitions."* Done. The
Canvas layer still renders animated dots (performance); a D3 SVG overlay now handles axes,
grid lines, trend line, and brush (correct tick placement, pointer events).

---

### 3.2 Sankey Diagram

The Sankey was migrated to a D3 layout algorithm during MS3 development but this introduced
label overlap on narrow viewports. The final version uses the original **manual layout**
(precise node positions hard-coded from the data proportions) while keeping D3 for
bezier link rendering. Gives the visual control that automatic layouts sacrifice.

Key editorial note: the "Published" stage (500 photos) is a user-provided estimate —
the dataset does not record which photos were actually published. This data limitation should
be disclosed in the process book.

---

### 3.3 Data range homogenisation

At MS3 submission, three of the five visualisations (Exposure Explorer, Gear Race, Lens
Race) were capped at 2024 while Activity and Heatmap already showed 2021–2026. This created
an inconsistent narrative: **2025 — a full year with 11,497 photos — vanished from most of
the site.**

Fix: extended all visualisations to 2025. 2026 (169 photos, partial year as of the dataset
export) remains visible only in Activity/Heatmap, where it contextualises the dataset
boundary without creating misleading empty bars in the race charts.

---

### 3.5 Photo Activity — session pinning + year→heatmap transition

**Session pin on click (delivered post-MS3)**
- Sessions timeline is interactive: click a session bar → heatmap enters highlight-lock state.
- Locked state: session days get blue outline, zero-count days tinted light-blue, all other
  days dim to 12% opacity.  Prevents hover from overriding the highlight while reading the
  detail card.
- Detail card shows date range, total photo count, and peak shooting day.
- Click same session or elsewhere → releases lock.

**Transition animation — iterative design**

Goal: clicking a year bar should *transform* into the heatmap, not shrink and re-expand.

| Attempt | Technique | Why abandoned |
|---------|-----------|---------------|
| Original | Height → 0, re-expand | Bar visually vanished; felt like two separate animations |
| 3D card flip | Width → 0 at midpoint (Y-axis flip) | Read as a glitch/flicker, not physical motion |
| Outward expansion | Bar grows directly into heatmap area | No rotational momentum; abrupt on short bars |
| **Clockwise rotation (current)** | `ctx.rotate(angle)`, 0 → π/2 | Bar falls like a domino — continuous physical motion |

**How the rotation math works:**
- After a 90° CW rotation, drawn width appears as screen height and vice versa.
- So drawn width lerps `barW → heatH` and drawn height lerps `barH → cssW`.
- Result: at rotation=90° the rect lands at screen dimensions `cssW × heatH` exactly.
- Bar colour fades out raw 0.25→0.80; heatmap grid fades in raw 0.35→0.85; monthly bars
  arrive raw 0.68→1.00. No abrupt snap — everything overlaps via cross-fade.

[ADD SCREENSHOT — year bar mid-rotation, tilted ~45°, heatmap cells visible beneath]

---

## 4. Challenges Summary

| Challenge | What we tried first | Final solution |
|-----------|---------------------|---------------|
| Aperture/shutter axes showed blobs | Linear scales | Log scales with stop-aware tick marks |
| Insight card annotation contradicted the visual | Pearson r label | Remove label; add binned median trend line |
| Colour encoding circular (scene type = f(ISO)) | — | Replace with focal range (independent variable) |
| Median label buried under 2000 dots | Floating label at end of curve | Move to legend as a proper entry |
| Lasso selection too complex | Considered polygon lasso | D3 rectangular brush |
| Brush alone doesn't separate overlapping dots | — | Zoom-into-selection with spring animation |
| "← Zoom out" button never appeared | — | Guard re-entrant D3 brush event: `if(expZoomed) return` |
| Data silently missing for 2025 | — | Re-run extraction with unified 2021–2025 filter |
| Sankey label overlap (D3 auto-layout) | D3 Sankey layout algorithm | Revert to manual node positions + D3 bezier links |
| Drag interaction not discoverable | Small corner badge (faded in 4.5 s) | Centred pulsing badge, persistent until first use |

---

## 5. What We Kept from MS2 (and Why)

- **Spring-physics dot animation** — the kinetic feel of axis changes is engaging and
  signals that points represent real, continuous data. Extended to power the zoom animation.
- **Canvas + D3 SVG hybrid** — Canvas for animated dots (60 fps with 2000 points), SVG
  for all interactive elements (correct hit-testing, D3 brush). Right pattern from MS2.
- **Contextual insight card** — tested well; users appreciated the plain-language
  explanation of each axis pair. Kept, with the prescriptive conclusion removed.
- **Scroll-driven single-page layout** — keeps the narrative linear without navigation
  overhead. The section order (broad temporal → detailed technical) was validated at MS2.
- **Colour palette and typography** — consistent across all sections; not changed.

---

## 6. Peer Contribution Breakdown

| Section | Lea | Adrien | Martina |
|---------|-----|--------|---------|
| Exposure Explorer (axes, trend, colour, insight cards) | ✓ | | |
| D3 brush selection + live statistics | ✓ | | |
| Zoom-into-selection | ✓ | | |
| Sankey diagram | partial | | |
| Gear Timeline (swimlane heatmap) | | | |
| Lens Race (animated bar chart) | | | |
| Photo Activity + day heatmap | | | |
| Data extraction / `extract_viz_data.py` | ✓ (year fix) | | |
| Site layout / CSS / navigation | | | |
| Process book | ✓ | | |
| Screencast | | | |

*Fill in Adrien and Martina's columns before submission.*

---

## 7. Checklist for the Final PDF

- [ ] Insert MS1 sketches (from `milestone 1/` folder)
- [ ] Insert MS2 Figure 1–6 as "before" references (from `milestone_2/Milestone_2_Data_Visualization.pdf`)
- [ ] Screenshot: Exposure Explorer with **linear** aperture axis (checkout an old commit to get this)
- [ ] Screenshot: Exposure Explorer after log scales + trend line
- [ ] Screenshot: brush selection active with stats panel
- [ ] Screenshot: zoomed-in view with ZOOMED IN badge
- [ ] Screenshot: full site from hero to Sankey (wide scroll)
- [ ] One paragraph: what did you personally learn about your photography from this project?
- [ ] Fill in Adrien and Martina's contribution rows above
- [ ] Add "Related work / inspiration" section (other photography viz, NYT style references, etc.)
- [ ] Confirm peer contribution framing with the team before submission
