# Process Book Notes — Through the Lens

Personal scratch pad for the process book. Each section = one meaningful decision or iteration.
Delete / reorganise freely before writing the final process book.

---

## Sankey Diagram (MS3)

**What changed:** Migrated the Sankey from a pure D3 layout to a hybrid Canvas+D3 approach,
then restored the original manual layout after the D3 one introduced label overlap and
visual inconsistencies with the rest of the site.

**Why:** The manual layout gives precise control over node/link positions, which matters for a
4-stage funnel where the proportions are already non-obvious (56k selected out of ~160k shots).

**Decisions:**
- Kept the Canvas-based rendering for the Sankey links (smooth curves via bezier)
- Labels placed to the side of nodes to avoid overlap on narrow viewports
- The "published" stage (500 photos) is explicitly user-provided, not derived from metadata —
  worth noting in the process book as an editorial choice

---

## Exposure Explorer — Axis Scales (MS3)

**What changed:** Replaced linear axes with perceptually correct log scales for aperture,
shutter speed, ISO, and focal length.

**Why:** Photographic exposure values are geometric, not linear. Each f-stop doubles the
light; each ISO stop doubles sensor gain. A linear axis compresses all the interesting
variation into a tiny corner and makes the scatter look like a blob.

- **Aperture:** `log2(f-stop) / log2(22)` — f/1.4 to f/22 maps evenly across the axis
- **Shutter:** `log(v × 4000) / log(8000)` — covers 1/4000 s to 2 s
- **ISO:** `log2(iso/100) / log2(256)` — 100 to 25600
- **Focal:** `log2(focal/14) / log2(200/14)` — 14 mm to 200 mm

**Before/after insight:** On the linear scale the "negative correlation" label was misleading
because aperture and ISO appeared unrelated. On log scales the relationship is immediately
visible as a clean diagonal band.

---

## Exposure Explorer — Removed "Negative Correlation" Annotation

**What changed:** Deleted the `drawAnnotations` function that drew an arrow + text label
("negative correlation" / "positive correlation") on the scatter plot.

**Why:** Users found it confusing rather than clarifying. The label was derived from a
heuristic (Pearson r on raw values) that didn't reflect the log-scale geometry, so it
sometimes said "negative" for what looked like a positive trend on screen. The D3 trend
line (binned medians) communicates the same idea more honestly without needing a label.

---

## Exposure Explorer — Focal Range Color Dimension

**What changed:** Replaced the "Scene type" color dimension (derived from ISO value) with
"Focal range" (Wide < 35 mm / Normal 35–85 mm / Tele > 85 mm).

**Why:** "Scene type" was circular — it coloured dots by ISO and then used that colour on
an ISO axis, making it impossible to tell if you were seeing a real pattern or just the
encoding. Focal range is an independent variable that reveals gear-usage patterns across
all axis combinations.

---

## Exposure Explorer — D3 Axes & Trend Line (MS3)

**What changed:** Replaced Canvas-drawn grid lines with a D3 SVG overlay (axes, grid,
trend line, brush).

**Why:** D3 gives correct tick placement on log scales, smooth axis transitions, and makes
the brush interaction much simpler to implement. The Canvas layer still draws the animated
dots; the SVG overlay handles everything structural.

**Trend line:** 12-bin median (binned on the X axis, median Y per bin, Catmull-Rom spline).
Chose median over mean to be robust to the long tails in photographic data (very high ISO
shots are rare but extreme). Moved the label to the chart legend rather than a floating
in-chart annotation — floating labels get buried under dots.

---

## Exposure Explorer — D3 Brush Selection (MS3)

**What changed:** Added D3 brush (drag-to-select rectangle) that highlights selected dots
and shows live statistics (count, median ISO/aperture/shutter/focal, camera and year
breakdown) in a panel below the chart.

**Why:** The scatter plot has ~2000 points; hovering one at a time is not enough to see
patterns. Brush selection lets users ask "what are the typical settings for this cluster?"
and get a quantitative answer immediately.

**UX details:**
- Unselected dots dim to 7% opacity so the selection stands out
- Selected dots grow slightly (radius 3.5 px vs 2 px for unselected)
- Tooltip is suppressed while a selection is active (hover restores when zoomed)
- The "Drag to select" affordance badge pulses and disappears permanently after first use

---

## Exposure Explorer — Zoom Into Selection

**What changed:** After releasing a brush selection, the plot automatically zooms in:
spring-physics animation flies all dots to their new positions filling the full canvas,
the axes update to show only the tick marks within the zoomed range, and a "ZOOMED IN"
badge appears. "← Zoom out" in the stats bar returns to the full view.

**Why:** The brush alone shows which dots are selected but doesn't let you see their
internal structure — points still overlap. Zooming separates the selected cluster, making
individual point positions readable and revealing sub-patterns within the selection.

**Technical note:** The zoom is computed from the bounding box of selected points in
normalised [0,1] space + 22% padding. Points outside the zoom range spring off-screen
and are clipped by the canvas clipping rect. The D3 brush is hidden while zoomed to
avoid interaction confusion.

**Bug fixed:** D3 dispatches brush `end` synchronously when `.move(null)` is called,
causing the re-entrant handler to clear `expBrushSel` before the zoom-out button could
render. Fixed by setting `expZoomed=true` before any `.move()` call and guarding with
`if(expZoomed) return` at the top of the handler.

---

## Data Range Homogenisation

**What changed:** Extended Gear Race, Lens Race, and Exposure Explorer from 2021–2024
to 2021–2025. Activity bar chart and heatmap already showed 2025–2026.

**Why:** 2025 has 11,497 photos — a full year of shooting. Leaving it out of three of the
five visualisations created an inconsistent narrative where the most recent year simply
disappeared. 2026 has only 169 photos (partial year, as of the dataset export) and is kept
only in the Activity/Heatmap sections.

**Files changed:** `extract_viz_data.py` (year filter + month range), `index.html`
(YEARS array + YR_COLS colour map), `viz_data.js` (regenerated — gear/lens now run
Feb 2022–Dec 2025, EXP_DATA gains 537 points from 2025).

---

## UX Polish — Drag Hint & Median Legend

**What changed:**
- Drag hint: replaced a tiny fading corner badge (4.5 s fadeout) with a centred, persistent
  `160×30 px` badge with an orange dashed border that pulses. Disappears only after the user
  first drags — so it's always visible to first-time visitors.
- Median label: moved from a 10 px floating text at the end of the trend curve (buried under
  dots) to a proper legend entry with a matching inline SVG line segment, alongside the
  colour legend. Always visible, never overlaps data.

---

## Commits Reference

| Hash | Description |
|------|-------------|
| `d94c17e` | Fix zoom-out button never appearing |
| `e7b7fd1` | Add zoom-into-selection to Exposure Explorer |
| `b40804a` | Extend all visualizations to include 2025 data |
| `ce952b1` | Improve Exposure Explorer UX: drag hint & median legend |
| `9673096` | Merge MS3_Lea: Exposure Explorer improvements + D3 brush |
| `f4e8f43` | Add D3 brush selection with live stats |
| `2740840` | Improve Exposure Explorer: log scales, D3 axes, trend line |
| `8723801` | Restore original Sankey visual using manual layout |
| `74567db` | Migrate Sankey to D3, add D3 SVG axes to Exposure Explorer |
