# Implementation Worklog

## Status

Mode: product

Glyph Flow is a procedural typographic motion tool with a deterministic WebGL2 renderer, editable controls, loop timeline, still export, and video export.

## Decision Trail

### Iteration 1 — Reference study and product definition

- Request: Build a procedural-motion generator like the supplied animated GIF using the Toolcraft scaffold.
- Task type: Fresh Toolcraft product implementation.
- User-visible result: A 500 × 580 animated micro-type field whose organic threshold mask forms moving masses, voids, edge dust, and grain.
- Source/reference checked: `/Users/natochi/Downloads/effect.gif` and the generated contact sheet of sampled frames.
- Reference inputs: 500 × 580 pixels, 37 frames, 10 fps, 3.7-second infinite loop; sampled at start, quarter, middle, three-quarter, and closing frames.
- Docs/contracts read: Root and project `AGENTS.md`; Toolcraft schema, product, timeline, export, acceptance, performance, browser, and worklog contracts; brainstorming and writing-plans skills.
- Contract rules applied: Product mode, custom product canvas, mandatory Background section, sticky export actions, persistent canvas/controls/timeline, typed acceptance matrix, real-browser performance coverage, and exact output-size helpers.
- Decision: Recreate the visual grammar rather than frame-copy the source: repeated glyph texture + domain-warped fBm + threshold/softness + deterministic dust.
- Alternatives rejected: DOM glyph grids were rejected for animation cost; a copied GIF/video layer was rejected because controls would not regenerate the motion; CPU pixel loops were rejected for live feedback cost.
- State/output mapping: Glyph controls regenerate the text texture; field and motion controls update shader uniforms; colors and Include update the composite; timeline progress drives a circular noise orbit; export controls affect delivery only.
- Files changed: `specs/glyph-flow-spec.md`, `specs/glyph-flow-plan.md`, `src/app/app-schema.ts`, `src/app/glyph-flow.ts`, `src/app/product-renderer.tsx`.
- Verification: Reference metadata and contact sheet inspected; shader output reviewed in a real Chromium screenshot against the source composition.
- Skipped checks: None for reference study and specification.
- Risks: The source GIF itself is not perfectly seamless, so the product uses an intentionally seamless forward loop instead of copying its closing discontinuity.

### Iteration 2 — Controls, timeline, and delivery

- Request: Make the look procedural and controllable, not a fixed animation.
- Task type: Product behavior and export implementation.
- User-visible result: Corpus, Size, Row spacing, Scale, Coverage, Warp, Edge softness, Detail, Seed, Cycles, Drift, Grain, foreground/background colors, Include, image delivery, and video delivery controls.
- Source/reference checked: Toolcraft runtime helpers and component contracts in `src/toolcraft/runtime`.
- Reference inputs: The source's compact typography, dark graphite ground, pale ink, large negative spaces, and 10 fps cadence.
- Docs/contracts read: Toolcraft controls, canvas, persistence, timeline, image export, video export, and panel-action contracts.
- Contract rules applied: Default 4K image delivery; PNG/JPG and 2K/4K/8K; MP4/WebM and Current/4K; transparent PNG when Include is off; video always keeps the background; 3.7-second editable loop.
- Decision: Use deterministic seed hashing and a circular `(cos θ, sin θ)` noise orbit so identical state produces identical frames and the end joins the start.
- Alternatives rejected: Linear drift was rejected because it introduces a loop seam; per-frame random grain was rejected because it prevents deterministic exports; GIF export was rejected in favor of the required image/video delivery surfaces.
- State/output mapping: `state.values` is normalized by `getGlyphFlowSettings`; `state.timeline` becomes loop progress; the same renderer is reused by preview, still tiles, and encoded video frames.
- Files changed: `src/app/app-schema.ts`, `src/app/export.ts`, `src/routes/index.tsx`, `src/app/app-acceptance.ts`, `src/app/app-product.test.ts`, `e2e/glyph-flow-acceptance.spec.ts`.
- Verification: Browser tests decoded PNG/JPG bytes, alpha, 2K/4K dimensions, WebM metadata, duration, progress, timeline edits, and persisted state.
- Skipped checks: None for product behavior and delivery.
- Risks: Chromium may expose WebM when MP4 recording is unavailable; the downloaded extension follows the actual supported MIME type.

### Iteration 3 — Performance hardening

- Request: Keep controls and procedural playback responsive at the declared workload limits.
- Task type: Renderer and export performance iteration.
- User-visible result: Smooth control feedback, responsive viewport gestures, native-reference preview density, and non-blocking high-resolution still encoding.
- Source/reference checked: Real browser frame gaps, long tasks, interaction timings, decoded exports, and GPU-context behavior across sequential tests.
- Reference inputs: 500 × 580 native preview, five detail octaves, resolution scale 2, 4K video selection, and 8K image selection.
- Docs/contracts read: Toolcraft performance matrix, renderer pipeline, stress/workload fixture, and fallback browser-runner contracts.
- Contract rules applied: Every declared scenario uses real controls or viewport/timeline actions; frame-gap budgets remain at or below 120 ms, long-task budgets at or below 250 ms, and interaction budgets at or below 2000 ms.
- Decision: Cache the glyph/noise textures and uniform locations; transfer the visible canvas to a Web Worker and render WebGL there at the source's 10 fps cadence; pause invalidation during pan/zoom; tile still rendering cooperatively; encode on `OffscreenCanvas` when available.
- Alternatives rejected: Loosening budgets was rejected; main-thread WebGL and WebGL-to-Canvas2D preview copies were rejected because SwiftShader/readback stalled UI frames; a framebuffer + `blitFramebuffer` path was rejected because its software blit was slower; synchronous 4K readback was rejected after producing long tasks.
- State/output mapping: Only glyph content/size/spacing/seed invalidate the text texture; field, motion, and color changes update uniforms; viewport transforms do not rebuild product resources; export resolution allocates delivery surfaces without enlarging live preview work.
- Files changed: `src/app/glyph-flow.ts`, `src/app/glyph-flow-worker.ts`, `src/app/glyph-flow-image-worker.ts`, `src/app/product-renderer.tsx`, `src/app/export.ts`, `src/app/app-performance.ts`, `src/app/app-product-performance.test.ts`, `e2e/performance-helpers.ts`, `e2e/glyph-flow-performance.spec.ts`.
- Verification: TypeScript and 53 focused schema/product/performance unit tests pass; targeted browser acceptance and performance probes pass in isolation and in sequential batches.
- Skipped checks: None; Playwright is the documented fallback because agent-browser is unavailable in this environment.
- Risks: Software WebGL measurements are sensitive to unrelated concurrent Chromium/SwiftShader suites, so the final checkpoint is run without another Toolcraft GPU suite competing for the same renderer.

## Decisions

### Renderer

- Decision: WebGL2 fullscreen shader in a dedicated preview Worker with a cached two-row glyph texture, deterministic 256 × 256 noise texture, vectorized two-scale domain warp, fBm threshold, and edge-weighted dust.
- Reason: It matches the source's organic micro-type masses while keeping parameters continuous and deterministic.
- Evidence: `src/app/glyph-flow.ts`; browser output shows large evolving voids, dense pale type, and boundary grain against `#202222`.

### Timeline

- Decision: Editable 3.7-second loop at a 10 fps export cadence, driven by a circular procedural orbit.
- Reason: 3.7 seconds and 10 fps are measured from the 37-frame source; the circular path guarantees forward-only seam continuity.
- Evidence: Timeline schema and acceptance tests verify playback, scrub, duration edits, persistence, and encoded video metadata.

### Layers

- Decision: A single composited product layer with documented internal stages: glyph texture, organic field, threshold/edge dust, and background composite.
- Reason: These stages are renderer-owned and should remain synchronized rather than expose misleading layer reordering.
- Evidence: Renderer pipeline declarations and product selector coverage identify the single `glyph-flow` output surface.

### Controls

- Decision: Expose only parameters that materially change typography, organic topology, loop motion, ink, background, or delivery.
- Reason: The inventory maps directly to visual evidence from the reference and avoids inert starter controls.
- Evidence: Nineteen acceptance rows cover all control targets, panel actions, timeline behavior, and persistence.

### Export

- Decision: Share one deterministic renderer across preview/stills/video; render stills in cooperative tiles and encode with OffscreenCanvas; render video at 10 fps with timestamped frames when supported.
- Reason: Sharing settings guarantees visual parity, while tiles and asynchronous encoding prevent 4K/8K delivery from monopolizing the UI thread.
- Evidence: Browser tests decode format, alpha, dimensions, non-empty bytes, video dimensions, duration, and reported frame progress.

### Performance

- Decision: Worker-owned WebGL preview at 10 fps, cached resources, interaction invalidation rules, cooperative image tiles, explicit worker/WebGL teardown, and 27 product scenarios.
- Reason: These measures keep the strict Toolcraft budgets meaningful without weakening visual behavior or test thresholds.
- Evidence: `src/app/app-performance.ts`, 27 unit scenarios, and 30 fallback-browser scenarios including Toolcraft contract checks.

## Evidence

- Video storyboard: opening frame establishes dense top mass and central void; quarter frame pushes the opening laterally; midpoint breaks the mass into a broad top band and lower island; three-quarter frame reforms the lower field; closing frame approaches the opening topology.
- Transition evidence: All intervals are continuous forward deformation with no cuts, fades, overlays, or reverse playback.
- Visual vocabulary: graphite background, cool off-white micro-type, organic threshold islands, large voids, eroded edges, sparse particulate grain.
- Product evidence: The real canvas carries `data-toolcraft-product-output="glyph-flow"`; controls mutate renderer-observable signatures and decoded exports.
- Delivery evidence: PNG/JPG supports 2K/4K/8K; PNG alpha follows Include; MP4/WebM selection resolves to a supported recorder MIME; Current/4K video dimensions use the Toolcraft size helper.

## Verification

- Run: `npm run typecheck`
- Result: Pass.
- Run: focused Vitest schema, product, and performance suites (53 tests)
- Result: Pass.
- Run: targeted Playwright acceptance for transparency, image format, image dimensions, video/PNG actions, and progress
- Result: Pass.
- Run: targeted Playwright performance batches for sliders, animation, viewport, timeline, PNG, and delivery selection
- Result: Pass without unrelated concurrent SwiftShader workload.
- Run: `npm run verify:perf`
- Result: Pass, 30 browser performance scenarios.
- Run: `npm run verify:quick`
- Result: Pass, 267 unit/contract tests plus Toolcraft integrity and AI workflow checks.
- Run: `npm run verify:final`
- Result: Pass, 267 unit/contract tests, production build, and 39 browser acceptance tests.
- Reason: agent-browser unavailable; Playwright fallback used for browser acceptance and performance checkpoints.

## Risks

- Risk: Actual MP4 encoding depends on browser support; unsupported MP4 requests fall back to WebM and use the matching extension.
- Risk: 8K stills intentionally trade total completion time for UI responsiveness by yielding between tiles.
- Risk: Resolution scale 2 increases Worker shader pixels; the 10 fps preview cadence follows the measured source while exported stills and video render at their requested pixel dimensions. The live preview requires browser support for transferable OffscreenCanvas.
