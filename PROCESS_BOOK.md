# Through the Lens: 4 Years of Campus Life in 57k Photos
## Process Book — COM-480 Data Visualization, EPFL

**Lea Grieder** · May 2026

---

## 1. Project Overview

Every photograph carries an invisible layer of information: the ISO that betrays the
lighting conditions, the aperture that reveals whether you were shooting wide open in a
dark room or stopped down in afternoon sun, the shutter speed that tells you whether you
were freezing motion or risking blur. Individually these numbers mean little. Aggregated
across 56,882 photographs shot over four years on the EPFL campus, they reconstruct a
detailed portrait of how, when, and with what creative intent a photographer's practice
evolved.

*Through the Lens* turns this invisible technical layer into an interactive visual
narrative. Rather than showing the photos themselves, we visualize the metadata silently
recorded by the camera and post-processing software — revealing patterns in campus life,
shooting conditions, and stylistic evolution that would be impossible to perceive by
browsing images individually.

The dataset consists of a Lightroom EXIF export covering 56,882 photographs taken between
September 2021 and May 2026, with 952 metadata fields per image: capture-time parameters
(ISO, aperture, shutter speed, focal length), camera and lens identifiers, file geometry,
and the full record of Lightroom post-processing adjustments (Clarity, Dehaze, Shadows,
and dozens of others). The four complete shooting years — 2022, 2023, 2024, and 2025,
with 12,746, 14,986, 17,483, and 11,497 photographs respectively — form the core of the
analysis.

---

## 2. From Concept to Prototype (MS1 → MS2)

### 2.1 The original vision

The MS1 report framed four main axes of exploration. **Temporal patterns** would reveal
the rhythms of campus life through calendar heatmaps — when does shooting happen, and does
that rhythm repeat across years? **Technical fingerprint** would expose the exposure
triangle through interactive scatter plots: how do ISO, aperture, and shutter speed
constrain each other? **Creative evolution** would track how post-processing style
developed over time via ridgeline plots of Lightroom parameters. **Gear story** would trace
the progression of camera and lens equipment through Sankey diagrams and stacked area
charts.

Two pieces of outside work shaped our thinking from the start. The Pudding's *"Is the Love
Song Dying?"* demonstrated how placing thousands of data points as animated dots — each
representing a single cultural object — creates a collective behavior that reveals trends
no individual item could show. Nathan Yau's *"A Day in the Life of Americans"* showed how
animating a mass of dots across a time axis turns abstract statistics into lived rhythm.
Both inspired the central design decision of the Exposure Explorer: treat each photograph
as a single dot in a two-dimensional space, and let the viewer discover patterns in the
collective cloud.

[FIGURE 1: MS1 EDA — temporal distribution (years, months, hours) and exposure
distributions (ISO, aperture, shutter speed)]

The exploratory data analysis conducted at MS1 confirmed the dataset's suitability. Core
fields — DateTimeOriginal, ISO, FNumber, Model — are present for over 99% of images.
Camera usage is highly concentrated: the Sony A7 IV accounts for the majority of shots,
providing technical consistency across the dataset. Lens metadata required partial recovery
for fixed-lens cameras (Fujifilm X100VI, Panasonic LX100) by inferring optics from the
camera model field. After recovery, 52 distinct lenses were identified, with usage
concentrated around a handful of frequently used Sony GM lenses.

### 2.2 The MS2 prototype

By MS2, a functional prototype was live at
`https://com-480-data-visualization.github.io/through_the_lens/`. The site follows a
scroll-driven structure, moving from broad temporal context toward increasingly technical
photographic detail. Five visualizations were prototyped:

**Photo Activity** answers *when does shooting happen?* through a two-level drill-down:
an annual bar chart transitions on click to a GitHub-style calendar heatmap for the
selected year. Clicking a day surfaces the date, count, and session name. Partial years
(2021 and 2026) are rendered at reduced opacity.

**Gear Timeline** answers *which cameras were active and when?* through a swimlane
heatmap — one row per camera body, one column per month, cell intensity proportional to
shots taken that month (normalised per body so all cameras remain visible). An animated
bar chart race was considered and rejected: the Sony A7 IV accounts for ≈96% of shots,
which would collapse a race to one dominant bar and hide all other bodies. The static
swimlane preserves the full temporal picture.

**Exposure Explorer** answers *how do ISO, aperture, shutter speed, and focal length
relate to each other?* by placing ≈2,000 sampled photographs as individual dots in a
user-configurable two-axis space. The user selects X and Y from four parameters; every
dot animates via spring physics to its new position when axes change. A contextual insight
card explains each axis combination in plain language.

**Lens Race** answers *how did lens usage shift over time?* through an animated horizontal
bar chart race: cumulative shots per interchangeable lens from the start of the dataset,
with bars reordering as rankings change and a play/pause slider controlling playback.

**Workflow Sankey** answers *how many photographs survive each stage of the workflow?*
through a compact Sankey diagram: Picture shots → Selection → Edition → Published, with
link widths proportional to counts.

[FIGURE 2: MS2 screenshot — Exposure Explorer scatter plot (ISO vs aperture, coloured by
year), showing linear aperture axis and scene-type colour dimension]

---

## 3. Design Evolution: MS2 → MS3

### 3.1 Exposure Explorer — the central iteration

The Exposure Explorer received the most substantial rework between MS2 and the final
submission. Three problems with the MS2 prototype required correction, and the MS2 extra
ideas were reconsidered in light of what would actually improve understanding.

**Fixing the axis scales.** At MS2, ISO was already on a logarithmic scale (labelled as
such in the chart), but aperture and shutter speed remained linear. This was physically
wrong: photographic stops are doublings, not additions. A linear aperture axis makes the
gap between f/1.4 and f/2 look the same as the gap between f/8 and f/9, when in fact they
are each one full stop and the latter pair barely differs in exposure terms. On a linear
axis, most of the visual space is consumed by rarely-used narrow apertures, and the
interesting region — f/1.4 to f/5.6, where creative choices happen — is compressed into
a narrow slice.

All four axes were replaced with stop-aware logarithmic transforms: aperture uses
$\log_2(f) / \log_2(22)$, shutter uses $\log(v \times 4000) / \log(8000)$, ISO uses
$\log_2(\text{ISO}/100) / \log_2(256)$, and focal length uses
$\log_2(\text{focal}/14) / \log_2(200/14)$. Each transform maps the natural photographic
range to [0, 1] with perceptually equal stop spacing. The result is that the classic
exposure-triangle relationships become immediately visible as diagonal bands rather than
right-angle clusters.

[FIGURE 3: Exposure Explorer after log scales — ISO vs aperture showing the dark-scene
diagonal band clearly]

**Replacing the circular colour dimension.** The MS2 "scene type" colour was derived from
ISO level: images with ISO < 800 were labelled "outdoor," those above were "indoor." When
this colour was used on a chart whose X axis was ISO, the encoding became tautological —
the colour gradient simply echoed the axis it was supposed to complement. The insight card
text that accompanied this view ("strong negative correlation — shooting in dark scenes
forces high ISO and wide aperture simultaneously") was correct as a photographic principle
but presented as a conclusion to be accepted rather than a pattern to be discovered.

Both were replaced. The colour dimension was changed to **Focal range** (Wide < 35 mm /
Normal 35–85 mm / Telephoto > 85 mm), an independent variable that reveals gear-usage
patterns across all axis combinations: wide lenses cluster toward lower ISO (outdoor, good
light), telephoto toward higher ISO (events, concerts, indoor sport). The annotation was
removed entirely.

**Adding an empirical trend.** To preserve the interpretive aid of the annotation without
its prescriptive conclusion, a **binned median trend line** was added: the X axis is
divided into 12 equal bins, the median Y value is computed in each bin from the full
dataset, and the resulting points are connected with a Catmull-Rom spline. The median is
more robust to the long tails in photographic data than the mean — very high ISO shots are
rare but extreme. The trend line renders the photographic relationships empirically, from
the data, and correctly for any axis pair regardless of scale.

The label "median" was initially a small floating text placed at the right end of the
curve. In practice it was frequently buried under the dot cloud. It was moved to the
chart legend, where it sits as a proper entry — a short orange line segment followed by
the label "Median trend" — always visible and never occluded.

**Implementing selection: brush and zoom.** The MS2 extra ideas listed "lasso selection
to isolate a cluster" and "linked highlighting with the Gear Timeline." A free-form lasso
requires complex hit-testing and is difficult to use precisely with a mouse; linked
highlighting across two canvases introduces coupling that slows rendering. Both were
reconsidered.

Instead, a **D3 rectangular brush** was implemented — the standard interaction for
scatter plot selection, familiar to anyone who has used Tableau, Vega-Altair, or similar
tools. Dragging on the chart draws a selection rectangle; all dots within it are
highlighted (full colour, radius 3.5 px) while the rest dim to 7% opacity. A statistics
panel appears below the chart showing the count of selected photos and their median ISO,
aperture, shutter speed, and focal length, along with a breakdown by camera and year.

The brush interaction was discovered to have a discoverability problem: in user testing,
the interaction was not obvious. A centred badge — "Drag to select photos," rendered with
a dashed orange border and a gentle pulse animation — was added to the chart area. It
remains visible until the user first drags, then disappears permanently; the pulse
animates attention without being intrusive.

[FIGURE 4: Brush selection active — selected dots highlighted, stats panel visible with
medians and camera breakdown]

**Zoom into selection.** After implementing the brush, a second problem emerged: even
with non-selected dots dimmed, 2,000 points remain dense enough that the internal
structure of a selected cluster is hard to read. The dots still overlap; only the *which*
of the selection is clear, not the *how* of the distribution within it.

On releasing the brush, the chart now zooms in. The bounding box of the selected points
is computed in normalised axis space and expanded by 22% padding on each side. This
defines a new viewport — a sub-range of both axes — and the spring-physics engine
re-targets every dot to its position within that viewport. The animation flies all 2,000
dots to their new positions, filling the full canvas with what was previously a small
cluster. The D3 axes update simultaneously to show only the tick marks that fall within
the zoomed range.

The effect is that a sub-second animation transforms a dense excerpt of the full scatter
into a readable spread, making individual dot positions and sub-groupings visible. A
"ZOOMED IN" badge appears in the top-left of the plot; the statistics panel's "× clear"
button becomes "← Zoom out," which springs everything back to the full view.

[FIGURE 5: Zoomed-in view — selected cluster now fills the canvas, axes show zoomed
tick range, ZOOMED IN badge visible]

One technical problem required careful debugging. D3's brush dispatches events
synchronously: when the brush's `.move(null)` method is called programmatically to clear
the selection rectangle after zoom is triggered, it re-fires the `end` event handler with
`selection = null`. The original implementation of that handler cleared `expBrushSel` on
any null selection — including this programmatic call — which meant the "← Zoom out"
button was erased from the stats panel before it could render. The fix was to set the
`expZoomed` flag *before* any programmatic brush move, and guard the `end` handler with
an early return when already in a zoomed state.

### 3.2 Sankey diagram

The Sankey diagram was migrated to the D3 Sankey layout algorithm during MS3 development.
The automatic layout introduced label overlap on narrower viewports because the four
stages have very different widths (160,574 shots → 56,882 selected → 56,882 edited →
500 published), and D3's auto-placement pushed labels into each other. The final version
reverts to the original manually specified node positions — which were designed knowing
the data proportions — while retaining D3 for bezier link rendering.

One aspect of the Sankey warrants explicit mention in the process book: the "Published"
count (500 photos) is a user-provided estimate. The dataset does not record which photos
were actually shared or published; Lightroom's publish services metadata was not exported.
The number was chosen conservatively based on memory and should be read as illustrative
rather than precise.

### 3.3 Gear Timeline — camera naming

The Gear Timeline swimlane heatmap referenced camera bodies by their internal EXIF model identifiers. One body appeared as `FC3582` — the raw model string written by the DJI Mini 4 Pro's firmware — rather than a recognisable name. Because the DJI appears only infrequently in the swimlane, the opaque identifier was easy to miss, but it rendered the row unreadable to any viewer not already familiar with DJI's internal product codes.

The fix was applied in `extract_viz_data.py`: the model normalisation map was extended with `"FC3582": "DJI Mini 4 Pro"`, and `viz_data.js` was regenerated. The Fujifilm X100VI entry was already rendered in a shortened but recognisable form and left unchanged.

### 3.4 Data coherence across visualizations

A consistency issue was identified late in development: three of the five visualizations
(Exposure Explorer, Gear Race, Lens Race) drew on a filtered dataset capped at 2024, while
the Photo Activity section already showed 2021–2026. The year 2025 — with 11,497 photos,
a complete and representative shooting year — was simply absent from most of the site.

The fix required updating `extract_viz_data.py` to extend the year range from 2024 to
2025, regenerating `viz_data.js`, and adding 2025 to the year colour map in
`index.html`. The year 2026 (169 photos, partial) remains visible only in the Activity
and Heatmap sections, where it contextualises the dataset boundary rather than creating
misleading empty bars in the race charts.

### 3.5 Photo Activity — session pinning and the year→heatmap transition

**Session pinning on click.**  The sessions timeline below the heatmap originally showed
shooting sessions as passive reference markers. Making it interactive required deciding
what "selecting a session" should mean visually. The chosen design locks the heatmap into
a highlight state: all days belonging to the pinned session are outlined in blue, zero-count
days within the session are tinted light blue so they remain findable, and all other days
dim to 12% opacity. A detail card appears below the timeline showing the session date
range, total photo count, and peak shooting day. A second click on the same session
(or any click outside it) releases the lock.  The pinned state persists through
mouse-move hovering, preventing the highlight from flickering when the user moves the
pointer to read the detail card.

**Iterating the year→heatmap transition.**  The original transition compressed the
clicked bar's height to zero before re-expanding it as the heatmap — visually convincing
in isolation but subjectively wrong: the bar appeared to shrink and vanish rather than
*transform* into something new.

Several approaches were attempted before landing on the current design:

- *3D card flip (Y axis):* the bar's width pinched to zero at the midpoint, then expanded
  as the heatmap face — like flipping a playing card.  The effect was clean but felt
  mechanical; the width-pinch read as a glitch rather than a physical motion.

- *Outward expansion:* the bar grew directly into the heatmap area without rotation.
  This felt abrupt on short bars (the bar had little visual momentum).

- *Clockwise rotation (current):* `ctx.translate(center); ctx.rotate(angle)` rotates
  the bar 90° clockwise around its own centre, like a domino falling to the right.
  Because a 90° CW rotation swaps the canvas axes, the drawn dimensions are deliberately
  inverted during the morph — drawn width lerps `barW → heatH` and drawn height lerps
  `barH → cssW` — so after the full rotation the rectangle lands in screen space at
  exactly `cssW × heatH`, the correct heatmap dimensions.  The bar never compresses:
  it only grows and rotates.  The bar colour cross-fades out over the second half while
  the heatmap grid fades in, so the "flip point" is visually smooth rather than a snap.

---

## 4. Challenges and What We Learned

Several problems recurred across the project and shaped the final design more than any
planned feature.

**Data encoding must match the domain's mental model.** The most impactful single change
in the project was replacing linear axes with logarithmic ones. Photographers think and
talk in stops — each stop is a doubling of light — so a linear axis actively misrepresents
the data. This lesson applies broadly: the choice of scale is not a cosmetic decision but
a statement about what differences in the data mean.

**Independent encoding matters.** The "scene type" colour dimension was not a design
mistake in isolation; it was internally consistent. It became a problem when combined with
an axis that encoded the same information. Colour, X axis, and Y axis should each carry
independent information; any redundancy should be deliberate (for emphasis) rather than
accidental (from circular derivation).

**Discoverability requires explicit affordance.** The brush interaction was implemented
and tested by the developer, for whom it was obvious. For first-time visitors with no
prior knowledge of the site, dragging on a chart is not an intuitive first action — the
chart looked like a static scatter plot. A visible affordance badge was necessary. This
is a general lesson: interactions that feel natural to the implementer often feel invisible
to the user.

**Camera naming requires human-readable normalisation.** Raw EXIF model strings are written by firmware and do not guarantee a human-readable name. DJI's `FC3582` identifier is unambiguous to a registry but invisible to a viewer. Any pipeline that passes EXIF model strings directly into a visualisation should apply a normalisation map; the correct place to maintain that map is the extraction script, not the front-end, so that the data file always contains resolved names.

**D3 event semantics have sharp edges.** Programmatic calls to D3's brush `.move()` fire
`end` handlers synchronously, which can cause re-entrant event processing. Testing the
brush in isolation did not reveal this; it only appeared when zoom was triggered from
within the `end` handler. Complex D3 interactions benefit from explicit state flags to
guard against re-entrant calls.

---

## 5. Reflection

The visualizations confirmed several patterns that were suspected but never precisely
known. Photographic activity peaks in May and September, corresponding to end-of-semester
events and the start of the academic year. Night shooting at ISO 3200 and above clusters
almost exclusively with the Sony A7 IV and the 70–200 mm telephoto lens — sport and
concert photography. The Fuji X100VI, introduced in 2024, is used almost exclusively in
daylight at ISO 400 or below, reflecting its use as a compact street camera.

Perhaps most surprising is the zoom visualization: looking at the cluster of shots at
ISO 100–200, f/2.8, 1/1000 s, you can see they are overwhelmingly taken with the 70–200
lens and coloured as telephoto — outdoor sports in bright afternoon light, frozen at a
fast shutter. This is a pattern that no amount of scrolling through individual photos
would have revealed; it required treating 57,000 photographs as a single distributional
object.

---

## 6. My Contributions

I was responsible for the Exposure Explorer in its entirety for the final submission:
the logarithmic axis transforms, the focal-range colour dimension replacing scene type,
the binned median trend line, the D3 axes and SVG overlay migration, the brush selection
with live statistics, the zoom-into-selection animation, and the UX affordance work
(drag hint, median legend entry). I identified and fixed the data range inconsistency
across all five visualizations, extending the dataset to 2025 in the extraction script,
data file, and colour mapping. I corrected the Gear Timeline camera naming by adding the
`FC3582 → DJI Mini 4 Pro` mapping to the extraction pipeline. I contributed to
resolving the Sankey merge conflicts that arose when the D3 layout migration was
integrated.
