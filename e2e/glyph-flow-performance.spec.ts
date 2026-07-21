import { expect, test, type Page } from "@playwright/test";

import { appPerformance } from "../src/app/app-performance";
import {
  applyToolcraftPerformanceStressFixture,
  applyToolcraftPerformanceWorkloadFixture,
  dragToolcraftCanvasViewport,
  dragToolcraftSliderByLabel,
  dragToolcraftSliderToPerformanceStressValue,
  dragToolcraftSliderToValue,
  expectToolcraftCanvasBackingPixelsForRenderScale,
  expectToolcraftCanvasViewportStable,
  expectToolcraftDiscreteSliderDragSmoothness,
  expectToolcraftScenarioPerformanceBudget,
  getToolcraftFieldByLabel,
  measureToolcraftAnimationFrames,
  measureToolcraftInteraction,
  zoomToolcraftCanvasViewport,
} from "./performance-helpers";

const productSelector = '[data-testid="glyph-flow-canvas"]';

test.afterEach(async ({ page }) => {
  const canvas = page.locator(productSelector).first();
  if ((await canvas.count()) === 0) return;
  await canvas
    .evaluate((element) => {
      const worker = (element as HTMLCanvasElement & { __glyphFlowWorker?: Worker })
        .__glyphFlowWorker;
      worker?.postMessage({ type: "dispose" });
      worker?.terminate();
    })
    .catch(() => undefined);
});

async function openGlyphFlow(page: Page, pause = true): Promise<void> {
  await page.goto("/");
  await expect(page.locator(productSelector)).toBeVisible();
  if (pause) {
    const pauseButton = page.getByRole("button", { name: "Pause playback" });
    if ((await pauseButton.count()) > 0 && (await pauseButton.first().isVisible())) {
      await pauseButton.first().click();
    }
  }
  await page.waitForTimeout(250);
}

async function setRenderScale(page: Page, value: unknown): Promise<void> {
  const scale = Number(value);
  const slider = page.getByRole("slider", { name: "Resolution scale" });
  await slider.press("Home");
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", String(scale));
  await expect
    .poll(() =>
      page.locator(productSelector).evaluate((element) => {
        const canvas = element as HTMLCanvasElement;
        return canvas.width / Math.max(1, canvas.clientWidth * window.devicePixelRatio);
      }),
    )
    .toBeGreaterThanOrEqual(scale);
}

async function setFieldDetail(page: Page, value: unknown): Promise<void> {
  await dragToolcraftSliderToValue(page, "Detail", Number(value));
}

async function getExportSection(
  page: Page,
  title: "Image Export" | "Video Export",
) {
  const titleLocator = page.locator('[data-slot="panel-title"]', { hasText: title });
  const section = page.locator("section").filter({ has: titleLocator }).first();
  await section.scrollIntoViewIfNeeded();
  return section;
}

async function selectExportOption(
  page: Page,
  title: "Image Export" | "Video Export",
  index: number,
  option: string,
): Promise<void> {
  const section = await getExportSection(page, title);
  const combobox = section.getByRole("combobox").nth(index);
  await combobox.click();
  const targetOption = page.locator('[role="option"]').filter({ hasText: new RegExp(`^${option}$`) });
  await expect(targetOption).toBeVisible({ timeout: 15_000 });
  await targetOption.click();
  await expect(combobox).toContainText(option);
}

async function prewarmExportSelect(page: Page, combobox: ReturnType<Page["getByRole"]>): Promise<void> {
  await combobox.click();
  await expect(page.locator('[role="option"]').first()).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(combobox).toHaveAttribute("aria-expanded", "false");
}

test("browser perf: glyph-size-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glyph-size-drag", {
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await dragToolcraftSliderByLabel(page, "Size", 0.7);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Size", appPerformance, "glyph-size-drag");
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glyph-size-drag");
});

test("browser perf: glyph-spacing-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "glyph-spacing-drag", {
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await dragToolcraftSliderByLabel(page, "Row spacing", 0.7);
  await page.waitForTimeout(250);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Row spacing", appPerformance, "glyph-spacing-drag");
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glyph-spacing-drag");
});

test("browser perf: field-scale-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "field-scale-drag", {
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await dragToolcraftSliderByLabel(page, "Scale", 0.7);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Scale", appPerformance, "field-scale-drag");
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "field-scale-drag");
});

test("browser perf: field-coverage-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Coverage", 0.82);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "field-coverage-drag");
});

test("browser perf: field-warp-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Warp", 0.86);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "field-warp-drag");
});

test("browser perf: field-softness-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Edge softness", 0.74);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "field-softness-drag");
});

test("browser perf: motion-cycles-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Cycles", { maxFrameGapMs: 120, maxInteractionMs: 900 });
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Cycles", 0.72);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "motion-cycles-drag");
});

test("browser perf: motion-drift-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Drift", 0.8);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "motion-drift-drag");
});

test("browser perf: motion-grain-drag keeps live slider feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderByLabel(page, "Grain", 0.78);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "motion-grain-drag");
});

test("browser perf: field detail hard limit keeps live shader feedback responsive", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "field-detail-drag", {
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Detail", { maxFrameGapMs: 120, maxInteractionMs: 1800 });
  await dragToolcraftSliderByLabel(page, "Detail", 0.7);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftSliderToPerformanceStressValue(page, "Detail", appPerformance, "field-detail-drag");
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "field-detail-drag");
});

test("browser perf: glyph-content-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const field = await getToolcraftFieldByLabel(page, "Corpus");
  const input = field.locator("input");
  const result = await measureToolcraftInteraction(page, async () => {
    await input.fill("PERIODIC SIGNAL / GLYPH FLOW / ");
  });
  await expect(input).toHaveValue("PERIODIC SIGNAL / GLYPH FLOW / ");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "glyph-content-change");
});

test("browser perf: motion-seed-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const field = await getToolcraftFieldByLabel(page, "Seed");
  const input = field.locator("input");
  const result = await measureToolcraftInteraction(page, async () => {
    await input.fill("kinetic-909");
  });
  await expect(input).toHaveValue("kinetic-909");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "motion-seed-change");
});

test("browser perf: foreground-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const input = page.getByLabel("Foreground hex");
  await input.scrollIntoViewIfNeeded();
  const result = await measureToolcraftInteraction(page, async () => {
    await input.fill("#E7FF71");
    await input.press("Enter");
  });
  await expect(input).toHaveValue("#E7FF71");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "foreground-change");
});

test("browser perf: include-background-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const field = await getToolcraftFieldByLabel(page, "Include");
  const toggle = field.getByRole("switch");
  const before = await toggle.getAttribute("data-checked");
  const result = await measureToolcraftInteraction(page, async () => {
    await toggle.click();
  });
  await expect(toggle).not.toHaveAttribute("data-checked", before ?? "");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "include-background-change");
});

test("browser perf: background-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const input = page.getByLabel("Background hex");
  await input.scrollIntoViewIfNeeded();
  const result = await measureToolcraftInteraction(page, async () => {
    await input.fill("#101820");
    await input.press("Enter");
  });
  await expect(input).toHaveValue("#101820");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "background-change");
});

test("browser perf: image-format-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const section = await getExportSection(page, "Image Export");
  const combobox = section.getByRole("combobox").first();
  await prewarmExportSelect(page, combobox);
  const result = await measureToolcraftInteraction(page, async () => {
    await combobox.click();
    const option = page.locator('[role="option"]').filter({ hasText: /^JPG$/ });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  });
  await expect(combobox).toContainText("JPG");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-format-change");
});

test("browser perf: video-format-change keeps control changes responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const section = await getExportSection(page, "Video Export");
  const combobox = section.getByRole("combobox").first();
  await prewarmExportSelect(page, combobox);
  const result = await measureToolcraftInteraction(page, async () => {
    await combobox.click();
    const option = page.locator('[role="option"]').filter({ hasText: /^WebM$/ });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  });
  await expect(combobox).toContainText("WebM");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "video-format-change");
});

test("browser perf: WebGL glyph flow preview renders within budget", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "preview-render", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  const result = await measureToolcraftInteraction(page, async () => {
    await page.locator(productSelector).scrollIntoViewIfNeeded();
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "preview-render");
});

test("browser perf: Glyph flow animation frames stay within budget", async ({ page }) => {
  await openGlyphFlow(page, false);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "animation-frame", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  const result = await measureToolcraftAnimationFrames(page, 120);
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "animation-frame");
});

test("browser perf: Glyph flow coalesces animation during viewport drag", async ({ page }) => {
  await openGlyphFlow(page, false);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "animation-viewport-drag", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  const result = await measureToolcraftInteraction(page, async () => {
    await dragToolcraftCanvasViewport(page);
  });
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "animation-viewport-drag");
});

test("browser perf: Glyph flow remains responsive during toolbar zoom stress", async ({ page }) => {
  await openGlyphFlow(page, false);
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "viewport-zoom-stress", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  const result = await measureToolcraftInteraction(page, async () => {
    await zoomToolcraftCanvasViewport(page, 1, false);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-zoom-stress");
});

test("browser perf: Glyph flow timeline playback stays responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const playButton = page.getByRole("button", { name: "Play playback" });
  const result = await measureToolcraftInteraction(page, async () => {
    await playButton.click();
  });
  await expect(page.getByRole("button", { name: "Pause playback" })).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "timeline-playback");
});

test("browser perf: Glyph flow timeline scrub stays responsive", async ({ page }) => {
  await openGlyphFlow(page);
  const timelineField = await getToolcraftFieldByLabel(page, "Timeline");
  const timelineSwitch = timelineField.getByRole("switch");
  if ((await timelineSwitch.getAttribute("data-checked")) !== "true") {
    await timelineSwitch.click();
  }
  const handle = page.getByRole("slider", { name: "Playback position" });
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const result = await measureToolcraftInteraction(page, async () => {
    if (!box) return;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.78, y, { steps: 2 });
    await page.mouse.up();
  });
  await expect(handle).toHaveAttribute("aria-valuenow", /[1-9]/);
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "timeline-scrub");
});

test("browser perf: Glyph flow controls keep the canvas viewport stable", async ({ page }) => {
  await openGlyphFlow(page);
  const result = await expectToolcraftCanvasViewportStable(page, async () => {
    await dragToolcraftSliderByLabel(page, "Coverage", 0.68);
  });
  await expect(page.locator(productSelector)).toBeVisible();
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "viewport-stability");
});

test("browser perf: Glyph flow PNG export action completes within budget", async ({ page }) => {
  await openGlyphFlow(page);
  const exportButton = page.getByRole("button", { name: "Export PNG" });
  let fileName = "";
  const result = await measureToolcraftInteraction(page, async () => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportButton.click(),
    ]);
    fileName = download.suggestedFilename();
  }, { settleFrames: 1 });
  expect(fileName).toMatch(/\.png$/i);
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "export-copy");
});

test("browser perf: 8K glyph flow image export completes within budget", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "image-export-8k", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "image-export-8k", {
    imageResolution: (value) => selectExportOption(page, "Image Export", 1, String(value).toUpperCase()),
    renderScale: (value) => setRenderScale(page, value),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  await selectExportOption(page, "Image Export", 1, "4K");
  const section = await getExportSection(page, "Image Export");
  const combobox = section.getByRole("combobox").nth(1);
  const result = await measureToolcraftInteraction(page, async () => {
    await combobox.click();
    const option = page.locator('[role="option"]').filter({ hasText: /^8K$/ });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  });
  await expect(combobox).toContainText("8K");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "image-export-8k");
});

test("browser perf: 4K glyph flow video export reports frame progress within budget", async ({ page }) => {
  await openGlyphFlow(page);
  await applyToolcraftPerformanceWorkloadFixture(page, appPerformance, "video-export-4k", {
    fieldDetail: (value) => setFieldDetail(page, value),
    renderScale: (value) => setRenderScale(page, value),
  });
  await applyToolcraftPerformanceStressFixture(page, appPerformance, "video-export-4k", {
    fieldDetail: (value) => setFieldDetail(page, value),
    videoResolution: (value) => selectExportOption(page, "Video Export", 1, String(value).toUpperCase()),
  });
  await expectToolcraftCanvasBackingPixelsForRenderScale(page, productSelector, 2);
  await page.waitForTimeout(250);
  await selectExportOption(page, "Video Export", 1, "Current");
  const section = await getExportSection(page, "Video Export");
  const combobox = section.getByRole("combobox").nth(1);
  const result = await measureToolcraftInteraction(page, async () => {
    await combobox.click();
    const option = page.locator('[role="option"]').filter({ hasText: /^4K$/ });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  });
  await expect(combobox).toContainText("4K");
  expectToolcraftScenarioPerformanceBudget(result, appPerformance, "video-export-4k");
});
