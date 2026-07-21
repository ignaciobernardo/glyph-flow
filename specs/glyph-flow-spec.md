# Glyph Flow — Product Specification

## Product goal

Glyph Flow creates animated typographic fields inspired by `/Users/natochi/Downloads/effect.gif`. A stable micro-type texture is revealed by a moving organic field, producing large flowing masses, eroded voids, and sparse dust. The output is deterministic for the same seed and timeline position, editable at any canvas size, and exportable as a still image or video.

## Verification note

Verification tier: Tier 4

Reason: This is the first working product version in a freshly generated Toolcraft app. It adds schema state, a custom animated WebGL renderer, timeline transport, persistence, PNG/video export, acceptance coverage, and performance coverage.

Run: `npm run verify:quick` during implementation; `npm run verify:final`; the first-version browser performance checkpoint through `npm run verify:perf` when an agent-controlled browser is unavailable; and `npm run dev` for the verified local URL.

Skip: Layers and media-upload checks, because the product is one procedural composite and has no source-media lifecycle. Keyframe checks are skipped because the product uses playback timeline mode, not property keyframes.

## Video Reference Study

### Reference and extraction evidence

- Reference location: `/Users/natochi/Downloads/effect.gif`
- Measured source: 500×580 px, 37 frames, 10 fps, 3.7 seconds, infinite GIF loop.
- Extraction: `ffprobe` was used for dimensions, rate, duration, and frame count. Eleven evenly sampled PNG frames were extracted with `ffmpeg -vf fps=3` into `/tmp/glyph-flow-reference/`; a 4×3 contact sheet was inspected at original detail.
- Palette: near-black `#202222`, light type near `#C1C3C2`, and antialias/grain intermediates.
- Grid: approximately 51 rows, 11–12 px vertical pitch, 7×8–9 px micro-glyphs, clipped at the canvas edges.

### Storyboard

| Frame | Time | Visible state | Behavior observation |
| --- | ---: | --- | --- |
| `f00` | 0.00 s | Dense top band and lower central island separated by a broad void. | The type texture is stable while an organic mask defines the silhouette. |
| `f04` | 0.40 s | The upper mass retracts and a diagonal bridge forms through the center. | Boundaries advect non-linearly; they do not translate as a single rigid object. |
| `f08` | 0.80 s | A large quiet void dominates the upper-right while a lower shelf expands. | Negative space is a first-class part of the composition. |
| `f12` | 1.20 s | Several disconnected islands appear with dusty fragments between them. | Low-opacity specks collect near mask boundaries and inside voids. |
| `f16` | 1.60 s | Type fills most of the frame with one large rounded cavity. | The field crosses a density threshold and produces contiguous paragraphs. |
| `f20` | 2.00 s | The dense field breaks into multiple irregular cavities. | Domain warping changes topology while row alignment remains stable. |
| `f24` | 2.40 s | A tall left mass and smaller right island are separated by a vertical channel. | Large-scale field motion combines with finer edge erosion. |
| `f28` | 2.80 s | A nearly full upper field collapses into a dark lower basin. | Coverage changes over time without changing type size or row pitch. |
| `f32` | 3.20 s | Dense text occupies the left and upper regions with a rounded right void. | The mask continues forward with no mirror or ping-pong motion. |
| `f36` | 3.60 s | A central dark channel separates two large type masses. | The source GIF does not stitch perfectly to the first frame. Glyph Flow intentionally uses a periodic field to improve the seam. |

### Transition analysis

- `f00 → f08`: the upper region erodes from right to left while the lower island widens. Anchors are field features rather than persistent objects; no rigid translation is visible.
- `f08 → f16`: disconnected islands merge into a high-coverage sheet. The text rows keep their baseline and spacing, proving that the mask, not the text layer, owns the main motion.
- `f16 → f24`: one cavity splits into several lobes and a vertical channel. Fine edge fragments trail the larger threshold boundary.
- `f24 → f32`: coverage expands at the top and left while right-side voids remain. Coarse and fine spatial frequencies evolve together.
- `f32 → f36 → f00`: the source has a visible discontinuity. The product maps timeline progress to a circular noise orbit so its first and last frames stitch without reverse, mirror, yoyo, or ping-pong behavior, including after duration edits.

### Behavior decomposition

1. A deterministic, aligned micro-type texture fills the entire output without margins.
2. A low-frequency, multi-octave, domain-warped scalar field reveals the type through a threshold and softness band.
3. Dust and grain add sparse intermediate pixels, especially near the moving boundary.
4. Timeline progress owns animation time. Field motion is forward-only and periodic; duration changes loop speed, not scene design.
5. Text, density, scale, detail, warp, edge softness, grain, motion cycles, seed, foreground, and background are user-editable.
6. PNG captures the selected timeline frame; video renders the whole runtime timeline and always keeps the product background.

### Acceptance mapping

| Observed behavior | Acceptance id |
| --- | --- |
| Stable micro-type field across the whole canvas | `glyph-content-output` |
| Organic low-frequency reveal changes topology | `field-scale-output` |
| Threshold controls filled versus empty regions | `field-coverage-output` |
| Domain warp makes irregular lobes | `field-warp-output` |
| Boundary softness and fine detail erode edges | `field-detail-output` |
| Sparse dust/grain remains in voids | `grain-output` |
| Deterministic seed changes the field | `seed-output` |
| Timeline playback and scrub change rendered frames | `timeline-output` |
| First and last frame stitch after duration changes | `timeline-loop-output` |
| Still and animated delivery reproduce the product | `export-png-output`, `export-video-output` |

## Product decisions

### Canvas and shell

- Use `defineToolcraft` and render through `ToolcraftApp`.
- Canvas sizing mode: `editable-output`, initial size 500×580 from the reference, render scale enabled.
- Toolbar: history, radar, theme, and zoom.
- Persistence: localStorage for values, canvas, panels, and timeline.
- Settings transfer: runtime-owned automatic export/import.

### Control Section Inventory

| Section | Product entity/stage | Targets | Grouping reason |
| --- | --- | --- | --- |
| Glyph Field | Stable text texture | `glyph.content`, `glyph.size`, `glyph.spacing` | The content and its grid density jointly define the repeated type texture. |
| Organic Field | Reveal mask | `field.scale`, `field.coverage`, `field.warp`, `field.detail`, `field.softness` | These values shape the scalar field and threshold boundary. |
| Motion | Periodic evolution | `motion.cycles`, `motion.drift`, `motion.grain`, `motion.seed` | These values alter temporal travel, edge texture, and deterministic variation without duplicating timeline transport. |
| Ink | Foreground type | `appearance.foreground` | The ink color is independent from the mandatory output background entity. |
| Background | Output background | `export.includeBackground`, `appearance.background` | Mandatory product background and PNG transparency behavior. |
| Image Export | Still delivery | `export.image.format`, `export.image.resolution` | Mandatory still encoder and final pixel size. |
| Video Export | Motion delivery | `export.video.format`, `export.video.resolution` | Mandatory animated container and final video size. |

Runtime Setup owns settings transfer, canvas size, render scale, and the Timeline presentation switch. Sticky footer actions own `Export Video` and `Export PNG`.

### Control selection

- `text` for a compact glyph corpus.
- Continuous `slider` for glyph size, row spacing, scale, coverage, warp, softness, drift, and grain.
- Discrete `slider` for integer field detail and loop cycles.
- `text` with setting commit mode for a numeric seed; no route-local state.
- Built-in `color`, `switch`, `select`, and `panelActions` for appearance and delivery.
- No custom controls are needed.

### Animation Intent Inventory

- Mode: playback timeline.
- Loop duration: 3.7 seconds, sourced from the 37-frame reference at 10 fps.
- Timeline is the only user-facing transport. No play/pause or duration controls are duplicated in the right panel.
- Motion is forward-only and periodic. `progress = currentTime / duration`; every time-dependent offset is derived from `cos(2πp)` and `sin(2πp)` so `p=0` and `p=1` match.

### Renderer Technique Decision Matrix

Machine-checkable decision vocabulary: `sourceRepresentation: mixed`, `productRepresentation: mixed`, `previewRenderer: webgl`, `exportRenderer: webgl`, `rendererWorkload: pixel-output`, `rendererStrategy: webgl`, `fidelityRisks`, `performanceRisks`, and `whyNotAlternativeStrategies`. WebGL preserves the reference-like per-pixel mask and product-quality export/copy behavior at the declared workload.

| Concern | Decision |
| --- | --- |
| Source representation | Procedural data plus an offscreen Canvas 2D text texture |
| Product representation | Mixed text texture and pixel composite |
| Preview renderer | WebGL2 |
| Export renderer | WebGL2 rendered into the standard Toolcraft PNG/video export paths |
| Workload | Shader-like pixel output with a cached type texture |
| Strategy | WebGL, because fBm/domain warp and full-canvas masking are per-pixel operations |
| DOM/SVG rejection | Thousands of independently changing glyph fragments would create excessive element/style work and cannot reproduce partial-glyph mask edges efficiently. |
| Canvas 2D rejection | A main-thread per-pixel mask at render-scale 2 and 4K/8K export would repeat expensive CPU pixel work each frame. Canvas 2D is limited to cached text rasterization and final copy. |

### Render Pipeline Inventory

The typed `rendererPipeline` records every pass, its `cacheKey`, and invalidation for `control-drag`, `control-change`, `animation-frame`, `timeline-playback`, `timeline-scrub`, `viewport-drag`, `viewport-zoom`, and export interactions.

1. `text-texture`: Canvas 2D, cached by glyph content, size, spacing, and output aspect; uploads one repeating luminance texture to the GPU.
2. `field-shader`: WebGL fragment shader, driven by scale, coverage, warp, detail, softness, cycles, drift, grain, seed, foreground/background, include-background, resolution, and timeline progress.
3. `preview-composite`: WebGL on a transferred OffscreenCanvas in a Worker at the selected HiDPI backing size and the source's 10 fps cadence. Animation posts settings only; control drags coalesce to one requestAnimationFrame.
4. `export-render`: a fresh WebGL canvas at the requested final dimensions using the same shader/config and explicit timeline progress.

### Renderer Layer Inventory

`rendererTechnique.layers` contains `backgroundLayer` (product background), `productForegroundLayer` (cached type texture plus noise/shader field), and `exportComposite` (the final composited delivery surface). There are no editing handles.

Viewport drag/zoom must not rebuild the text texture or change runtime play/pause state. Animation frames update shader uniforms only.

### Layers

Layers are disabled. The type texture, procedural field, grain, and background are one inseparable generated composition rather than independently editable objects.

### Export

- PNG/JPG uses `createToolcraftPngExportCanvas`, respects `export.image.resolution`, and uses transparent output only for PNG with Background Include off.
- Video exposes MP4 and WebM requests, chooses the first supported browser MIME/container, renders the runtime duration at a fixed frame rate, reports frame progress, and uses `getToolcraftVideoExportSize`.
- Video always includes the product background.

## Initial values

- Canvas: 500×580
- Duration: 3.7 s
- Glyph corpus: `流動形態 SIGNAL NOISE 0123456789 / `
- Glyph size: 9 px; row spacing: 11 px
- Background: `#202222`; foreground: `#C1C3C2`
- Field scale: 2.4; coverage: 54%; warp: 0.85; detail: 4; softness: 0.045
- Motion cycles: 1; drift: 0.75; grain: 35%; seed: `2703`
