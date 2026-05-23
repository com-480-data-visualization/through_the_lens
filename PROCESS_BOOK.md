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

### 3.2 Workflow Funnel 

**The MS2 starting point.** At MS2, the Workflow Funnel was a static Sankey diagram:
four nodes (Picture shots → Selection → Edition → Published) with loss exits at each
stage, rendered all at once on page load. The layout was manually specified — node
positions were chosen knowing the data proportions, which kept the bezier links readable
given the extreme width differences between stages (160,574 shots collapsing to 500
published). Hovering a link surfaced counts and drop-off rates. The diagram communicated
the funnel shape correctly, but presented it as a concluded fact rather than something
to explore.

[FIGURE X: MS2 Workflow Funnel — static diagram, all four stages visible simultaneously]

**Making the reveal interactive.** The central design question after MS2 was whether the
funnel should remain a single static view or become something navigable. A static diagram
of this shape has a legibility problem: the tiny Published node at the far right is
visually marginal — the eye goes immediately to the dominant loss flow and stays there.
A viewer who does not read every label carefully misses that the published count is an
estimate, and that the edition stage passes everything through intact.

The solution was a **staged progressive reveal**: rather than rendering all four columns
simultaneously, the diagram starts empty and builds left to right as the viewer selects
each stage. Clicking "Shots" draws only the leftmost node; "Select" adds the selection
node and its flows; "Edit" adds the edition column; "Publish" completes the funnel. Each
step gives the viewer time to read one transition before the next appears. 

**The incremental animation problem.** The first implementation animated the entire
visible diagram from scratch on every stage transition. This created a perceptual problem:
advancing from "Select" to "Edit" caused the already-established left columns to redraw,
making them appear to reset rather than persist. The fix was to track which columns were
already visible and animate only the newly added ones. The result reads as content
flowing forward rather than the whole chart restarting. 

**Illustrating the process.** The MS2 version included a legend below the diagram
identifying the color coding of nodes and flows. As the design evolved toward a staged
reveal, the legend became unnecessary — each stage is introduced explicitly by its
control pill, and the color progression speaks for itself. The space was repurposed to
bring the photography back into the picture: a scrollable strip of example images appears
as each stage is selected, showing raw captures for Shots, kept and culled pairs for
Select, before and after edits for Edition, and final images for Publish. Each stage now
answers not just *how many* but *what kind* — the viewer can see the visual difference
between a culled frame and a kept one, or between an unedited raw and its finished
version. Clicking any image opens a full-screen lightbox for closer inspection.

**Color and tone.** The node colors follow the site's blue-to-purple progression, giving
the funnel a sense of directional movement from left to right. Loss nodes are rendered in
muted gray — present and readable, but visually subordinate to the main flow. The
Published node picks up the site's orange accent when the final stage is active, a small
signal that this is the destination the entire funnel points toward.

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


### 3.5 Photo Activity — enriching the drill-down

**The MS2 starting point.** At MS2, Photo Activity was a two-level drill-down: an annual
bar chart transitioned on click to a GitHub-style calendar heatmap for the selected year.
Clicking a day opened a small panel below the heatmap showing the date, photo count, and
session name. The structure was sound — year to day is the right granularity progression
for this dataset — but the two views felt disconnected. The year chart gave no sense of
growth or rhythm across years, and the heatmap had no way to surface which days belonged
to the same shooting session without clicking each one individually.

[FIGURE X: MS2 Photo Activity — year bar chart and calendar heatmap side by side]

**Setting the scene before the chart.** The first addition was a three-figure banner
above the year chart: Peak Month, Longest Streak, and Best Day, computed across the full
dataset. These numbers serve as an entry point — a reader who lands on the section gets
an immediate sense of scale and rhythm before engaging with the chart itself. When
drilling into a specific year the banner updates to reflect that year's figures, so it
remains relevant at every level of the exploration.

**Reading a year at a glance.** The year bar chart gained year-over-year growth badges
— a small percentage figure above each bar showing the change from the previous year.
The progression from +18% to +17% to −34% tells the arc of the practice in three
numbers: steady growth through 2023 and 2024, then a tapering in 2025. This context
was previously invisible; without it, a reader would need to mentally compute the
differences from the bar heights alone.

**Giving the months a seasonal voice.** Inside the year drill-down, the twelve monthly
bars are colored by season — winter blues, spring teals, summer oranges, autumn purples —
with faint background tints marking each seasonal band. The color does not encode any
additional data dimension; it gives the monthly chart a visual rhythm that mirrors the
actual experience of a shooting year, where activity peaks follow the academic calendar
and the weather rather than the Gregorian months.

**From a click panel to a sessions chart.** The MS2 heatmap surfaced session information
only on individual day clicks — one day at a time, with no way to compare sessions or
understand which ones dominated the year. This was replaced with a named sessions bar
chart below the heatmap, showing the top sessions by total photo count. The bar chart
answers a question the heatmap alone cannot: not just *when* shooting happened, but
*what for*. A year that looks like scattered blue cells in the heatmap resolves, in the
sessions chart, into a clear hierarchy — Assos EPFL at 4.9k, Mediacom at 3.0k, the
structure of a practice that is not random but organised around recurring subjects.

**Linking the two views.** Once the sessions chart existed alongside the heatmap, a
natural question arose: which heatmap cells belong to which session? The answer was a
bidirectional highlight: hovering a session bar dims all heatmap days that do not belong
to it and draws an orange ring on the ones that do. The reverse also works — hovering a
heatmap cell highlights its session row in the bar chart and dims the others. The two
views become a single linked object, and a reader can move fluidly between the calendar
view of time and the ranked view of subjects.

**Bringing days to life with photographs.** The MS2 day click panel showed a date, a
count, and a session name — text only. The tooltip was extended to include a photograph
from that day when one is available, drawn either from a set of manually curated preview
images for standout days or from the hero gallery manifest for days that appear elsewhere
on the site. The photograph is not decorative; it gives the day a face. A cell marked
dark blue in the heatmap might represent a concert, a wedding, or an afternoon on campus
— the image makes that concrete in a way that a count of 927 photos cannot.

**The year-to-heatmap transition.** Clicking a year bar needed to feel like a genuine
navigation rather than a panel swap. Several approaches were tried before landing on the
final design — each attempt revealed a different way the motion could feel wrong, and the
full account of what failed and why is discussed in section 4. The final transition
rotates the bar 90° clockwise around its own centre, like a domino falling to the right,
so that the rectangle lands at exactly the heatmap dimensions after the full rotation.
The bar never compresses — it only grows and rotates — and the color cross-fades into
the heatmap grid at the midpoint, making the transition feel continuous rather than staged.
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

**Getting transitions to feel like navigation.** The year-to-heatmap transition in Photo
Activity went through three distinct attempts before reaching a design that felt right.
The first approach compressed the clicked bar's height to zero before re-expanding it as
the heatmap — visually the bar appeared to shrink and vanish rather than transform into
something new. A 3D card flip along the Y axis was tried next: the bar's width pinched
to zero at the midpoint, then expanded as the heatmap face. The effect was clean in
isolation but felt mechanical — the width-pinch read as a glitch rather than physical
motion. The solution that worked was a 90° clockwise rotation around the bar's own
centre, like a domino falling to the right. Because rotation swaps the canvas axes, the
drawn dimensions are deliberately inverted during the morph so the rectangle lands at
exactly the heatmap dimensions after the full turn. The lesson was that transitions
between views should preserve the visual mass of the original element throughout — any
compression or pinch breaks the sense that the two views are the same object seen
differently.

**Camera naming requires human-readable normalisation.** Raw EXIF model strings are
written by firmware and do not guarantee a human-readable name. DJI's `FC3582` identifier
is unambiguous to a registry but invisible to a viewer. Any pipeline that passes EXIF
model strings directly into a visualisation should apply a normalisation map; the correct
place to maintain that map is the extraction script, not the front-end, so that the data
file always contains resolved names.

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

**Lea** was responsible for the Exposure Explorer in its entirety for the final
submission: the logarithmic axis transforms, the focal-range colour dimension replacing
scene type, the binned median trend line, the D3 axes and SVG overlay migration, the
brush selection with live statistics, the zoom-into-selection animation, and the UX
affordance work (drag hint, median legend entry). She identified and fixed the data range
inconsistency across all five visualizations, extending the dataset to 2025 in the
extraction script, data file, and colour mapping. She corrected the Gear Timeline camera
naming by adding the `FC3582 → DJI Mini 4 Pro` mapping to the extraction pipeline, and
contributed to resolving the Sankey merge conflicts that arose when the D3 layout
migration was integrated.

**Martina** was responsible for the Photo Activity section in its entirety for the final
submission: the story banner, year-over-year growth badges, season-colored monthly bars,
the named sessions bar chart, the bidirectional heatmap-to-sessions highlighting, and the
tooltip photo previews. She led the MS3 iteration of the Workflow Funnel, redesigning the
static MS2 Sankey into the staged progressive reveal with horizontal stage controls, the
incremental animation, the photo strip, and the lightbox. The year-to-heatmap transition
animation was developed jointly with Lea.
