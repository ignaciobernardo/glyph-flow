import { expect, it } from "vitest";

import { appPerformance } from "./app-performance";

function expectScenario(id: string): void {
  const scenario = appPerformance.scenarios.find((candidate) => candidate.id === id);
  expect(scenario).toBeDefined();
  expect(scenario?.automated).toBe(true);
  expect(scenario?.browser).toBe(true);
  expect(scenario?.expectedObservable.trim()).not.toBe("");
}

it("glyph-size-drag keeps live slider feedback responsive", () => expectScenario("glyph-size-drag"));
it("glyph-spacing-drag keeps live slider feedback responsive", () =>
  expectScenario("glyph-spacing-drag"));
it("field-scale-drag keeps live slider feedback responsive", () => expectScenario("field-scale-drag"));
it("field-coverage-drag keeps live slider feedback responsive", () =>
  expectScenario("field-coverage-drag"));
it("field-warp-drag keeps live slider feedback responsive", () => expectScenario("field-warp-drag"));
it("field-softness-drag keeps live slider feedback responsive", () =>
  expectScenario("field-softness-drag"));
it("motion-cycles-drag keeps live slider feedback responsive", () =>
  expectScenario("motion-cycles-drag"));
it("motion-drift-drag keeps live slider feedback responsive", () =>
  expectScenario("motion-drift-drag"));
it("motion-grain-drag keeps live slider feedback responsive", () =>
  expectScenario("motion-grain-drag"));
it("field detail hard limit keeps live shader feedback responsive", () =>
  expectScenario("field-detail-drag"));
it("glyph-content-change keeps control changes responsive", () =>
  expectScenario("glyph-content-change"));
it("motion-seed-change keeps control changes responsive", () =>
  expectScenario("motion-seed-change"));
it("foreground-change keeps control changes responsive", () => expectScenario("foreground-change"));
it("include-background-change keeps control changes responsive", () =>
  expectScenario("include-background-change"));
it("background-change keeps control changes responsive", () => expectScenario("background-change"));
it("image-format-change keeps control changes responsive", () =>
  expectScenario("image-format-change"));
it("video-format-change keeps control changes responsive", () =>
  expectScenario("video-format-change"));
it("WebGL glyph flow preview renders within budget", () => expectScenario("preview-render"));
it("Glyph flow animation frames stay within budget", () => expectScenario("animation-frame"));
it("Glyph flow coalesces animation during viewport drag", () =>
  expectScenario("animation-viewport-drag"));
it("Glyph flow remains responsive during toolbar zoom stress", () =>
  expectScenario("viewport-zoom-stress"));
it("Glyph flow timeline playback stays responsive", () => expectScenario("timeline-playback"));
it("Glyph flow timeline scrub stays responsive", () => expectScenario("timeline-scrub"));
it("Glyph flow controls keep the canvas viewport stable", () =>
  expectScenario("viewport-stability"));
it("Glyph flow PNG export action completes within budget", () => expectScenario("export-copy"));
it("8K glyph flow image export completes within budget", () => expectScenario("image-export-8k"));
it("4K glyph flow video export reports frame progress within budget", () =>
  expectScenario("video-export-4k"));
