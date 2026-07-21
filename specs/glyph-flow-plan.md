# Glyph Flow — Implementation Plan

## Scope

Implement the approved Glyph Flow product behavior in the generated Toolcraft app without editing `src/toolcraft`.

## Files and passes

1. Product schema and metadata
   - Update `src/app/app-schema.ts` with editable-output canvas sizing, render scale, semantic control sections, playback timeline, persistence, settings transfer, Background/Image Export/Video Export sections, and sticky actions.
   - Update `src/app/app-acceptance.ts` with product readiness, Video Reference Study, Animation Intent Inventory, control-section inventory, and acceptance rows.

2. Procedural engine
   - Add `src/app/glyph-flow.ts` for typed settings, runtime-state parsing, deterministic seed handling, text-texture rasterization, WebGL shader/program setup, render scheduling, and still-frame rendering.
   - Add `src/app/product-renderer.tsx` to bind Toolcraft runtime state/timeline to the WebGL preview and expose product-output selectors.
   - Keep the animated render loop timeline-owned and coalesce work through requestAnimationFrame.

3. Export paths
   - Add `src/app/export.ts` for standard Toolcraft PNG/JPG output and supported MediaRecorder video output with timeline-derived frames, safe MIME fallback, final dimensions, background rules, and progress.
   - Update `src/routes/index.tsx` as a thin ToolcraftApp composition with `canvasContent`, `renderDefaultCanvasMedia={false}`, and `onPanelAction` download handlers.

4. Acceptance and performance
   - Update `src/app/app-product.test.ts` with deterministic renderer math/config tests and export-size behavior.
   - Update `src/app/app-performance.ts` with WebGL renderer technique, typed pipeline passes/invalidation, hard-limit fixtures, animation, viewport, controls, timeline, and export scenarios.
   - Update the named browser tests in `e2e/app-browser-acceptance.spec.ts`, `e2e/app-controls.spec.ts`, and `e2e/app-performance.spec.ts` so every acceptance/performance row has real UI evidence.
   - Keep all visible non-action controls classified as workload or responsiveness.

5. Worklog and verification
   - Replace the starter worklog with product decisions and concrete reference/verification evidence.
   - Run `npm run verify:quick`, then apply the `systematic-debugging` workflow to any failures.
   - Run `npm run verify:final`.
   - Run the required first-version performance checkpoint with `npm run verify:perf` if an agent-controlled browser is unavailable, record the runner and results, then start `npm run dev` and verify the saved app URL/identity.

## Acceptance focus

- Every visible control changes product pixels or export behavior.
- Reset uses schema defaults.
- Timeline play/pause, scrub, duration edit, and forward seamless loop affect the rendered field.
- LocalStorage restores a changed setting after reload.
- PNG/JPG formats and 2K/4K/8K sizes decode correctly; PNG transparency follows Background Include.
- Video MIME fallback, dimensions, duration, background, and progress are observable.
- Canvas backing pixels follow Resolution scale.
- Animation remains responsive during real viewport drag and toolbar zoom at the declared heavy fixture.

