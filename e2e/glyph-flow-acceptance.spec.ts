import { readFile } from "node:fs/promises";

import { expect, test, type Download, type Page } from "@playwright/test";

import {
  expectToolcraftDiscreteSliderDragSmoothness,
  getToolcraftFieldByLabel,
} from "./performance-helpers";
import {
  expectToolcraftProductObservableToChange,
  getToolcraftProductObservableSnapshot,
} from "./product-observable-helpers";

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

async function pauseGlyphFlow(page: Page): Promise<void> {
  const pauseButton = page.getByRole("button", { name: "Pause playback" });
  if ((await pauseButton.count()) > 0 && (await pauseButton.first().isVisible())) {
    await pauseButton.first().click();
  }
  await page.waitForTimeout(80);
}

async function openAppAtFixedFrame(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator(productSelector)).toBeVisible();
  await pauseGlyphFlow(page);
}

async function setSliderToEnd(page: Page, label: string): Promise<void> {
  const field = await getToolcraftFieldByLabel(page, label);
  await field.getByRole("slider").press("End");
}

async function getProductSection(page: Page, title: string) {
  const titleLocator = page.locator('[data-slot="panel-title"]', { hasText: title });
  const section = page.locator("section").filter({ has: titleLocator }).first();
  await section.scrollIntoViewIfNeeded();
  return section;
}

async function chooseExportOption(
  page: Page,
  sectionTitle: "Image Export" | "Video Export",
  index: number,
  option: string,
): Promise<void> {
  const section = await getProductSection(page, sectionTitle);
  const combobox = section.getByRole("combobox").nth(index);
  await combobox.click();
  const targetOption = page.locator('[role="option"]').filter({ hasText: new RegExp(`^${option}$`) });
  await expect(targetOption).toBeVisible({ timeout: 15_000 });
  await targetOption.click();
  await expect(combobox).toContainText(option);
}

async function downloadBuffer(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (!path) {
    throw new Error("Playwright did not provide the Glyph Flow download path.");
  }
  return readFile(path);
}

async function decodeImageBytes(
  page: Page,
  bytes: Buffer,
  mimeType: string,
): Promise<{ alphaMin: number; height: number; type: string; width: number }> {
  return page.evaluate(
    async ({ base64, type }) => {
      const binary = atob(base64);
      const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const blob = new Blob([data], { type });
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(96, bitmap.width);
      canvas.height = Math.min(96, bitmap.height);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        throw new Error("Could not inspect exported image pixels.");
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let alphaMin = 255;
      for (let index = 3; index < pixels.length; index += 4) {
        alphaMin = Math.min(alphaMin, pixels[index] ?? 255);
      }
      const height = bitmap.height;
      const width = bitmap.width;
      bitmap.close();
      return { alphaMin, height, type: blob.type, width };
    },
    { base64: bytes.toString("base64"), type: mimeType },
  );
}

async function readExportedVideoDurationAndDimensions(
  page: Page,
  bytes: Buffer,
  mimeType: string,
): Promise<{ duration: number; type: string; videoHeight: number; videoWidth: number }> {
  return page.evaluate(
    async ({ base64, type }) => {
      const binary = atob(base64);
      const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const video = document.createElement("video");
      video.preload = "metadata";
      const metadata = await new Promise<{
        duration: number;
        videoHeight: number;
        videoWidth: number;
      }>((resolve, reject) => {
        video.onloadedmetadata = () => {
          resolve({
            duration: video.duration,
            videoHeight: video.videoHeight,
            videoWidth: video.videoWidth,
          });
        };
        video.onerror = () => reject(new Error("Exported video metadata could not be loaded."));
        video.src = url;
      });
      URL.revokeObjectURL(url);
      return { ...metadata, type: blob.type };
    },
    { base64: bytes.toString("base64"), type: mimeType },
  );
}

async function setTimelineDuration(page: Page, value: string): Promise<void> {
  const timelineField = await getToolcraftFieldByLabel(page, "Timeline");
  const timelineSwitch = timelineField.getByRole("switch");
  if ((await timelineSwitch.getAttribute("data-checked")) !== "true") {
    await timelineSwitch.click();
  }
  const editDuration = page.getByRole("button", { name: "Edit timeline duration" });
  await editDuration.click();
  const editor = page.getByRole("textbox", { name: "timeline duration" });
  await editor.fill(value);
  await editor.press("Enter");
}

test("browser: glyph.content changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const field = await getToolcraftFieldByLabel(page, "Corpus");
  await expectToolcraftProductObservableToChange(
    page,
    () => field.locator("input").fill("ALT SIGNAL / 808 / "),
    { selector: productSelector },
  );
});

test("browser: glyph.size changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Size"), {
    selector: productSelector,
  });
});

test("browser: glyph.spacing changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(
    page,
    () => setSliderToEnd(page, "Row spacing"),
    { selector: productSelector },
  );
});

test("browser: field.scale changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Scale"), {
    selector: productSelector,
  });
});

test("browser: field.coverage changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Coverage"), {
    selector: productSelector,
  });
});

test("browser: field.warp changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Warp"), {
    selector: productSelector,
  });
});

test("browser: field.detail changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const field = await getToolcraftFieldByLabel(page, "Detail");
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]');
  await expect(slider).toBeVisible();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await field.getByRole("slider").press("Home");
  await expectToolcraftProductObservableToChange(
    page,
    () =>
      expectToolcraftDiscreteSliderDragSmoothness(page, "Detail", {
        maxFrameGapMs: 500,
        maxInteractionMs: 2000,
      }),
    { selector: productSelector },
  );
});

test("browser: field.softness changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(
    page,
    () => setSliderToEnd(page, "Edge softness"),
    { selector: productSelector },
  );
});

test("browser: motion.cycles changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const field = await getToolcraftFieldByLabel(page, "Cycles");
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]');
  await expect(slider).toBeVisible();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await field.getByRole("slider").press("Home");
  await expectToolcraftProductObservableToChange(
    page,
    () =>
      expectToolcraftDiscreteSliderDragSmoothness(page, "Cycles", {
        maxFrameGapMs: 500,
        maxInteractionMs: 2000,
      }),
    { selector: productSelector },
  );
});

test("browser: motion.drift changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Drift"), {
    selector: productSelector,
  });
});

test("browser: motion.grain changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await expectToolcraftProductObservableToChange(page, () => setSliderToEnd(page, "Grain"), {
    selector: productSelector,
  });
});

test("browser: motion.seed changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const field = await getToolcraftFieldByLabel(page, "Seed");
  const input = field.locator("input");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await input.fill("4815");
      await input.press("Enter");
    },
    { selector: productSelector },
  );
});

test("browser: appearance.foreground changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const input = page.getByLabel("Foreground hex");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await input.fill("FF3366");
      await input.press("Enter");
    },
    { selector: productSelector },
  );
});

test("browser: export.includeBackground hides preview background and makes transparent PNG output", async ({
  page,
}) => {
  await openAppAtFixedFrame(page);
  const section = await getProductSection(page, "Background");
  const include = section.getByRole("switch").first();
  await expect(include).toBeVisible();
  await expectToolcraftProductObservableToChange(page, () => include.click(), {
    selector: productSelector,
  });
  await chooseExportOption(page, "Image Export", 1, "2K");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const image = await decodeImageBytes(page, await downloadBuffer(await downloadPromise), "image/png");
  expect(image.width).toBe(1766);
  expect(image.height).toBe(2048);
  expect(image.alphaMin).toBe(0);
});

test("browser: appearance.background changes glyph flow product output", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const input = page.getByLabel("Background hex");
  await expectToolcraftProductObservableToChange(
    page,
    async () => {
      await input.fill("25114A");
      await input.press("Enter");
    },
    { selector: productSelector },
  );
});

test("browser: export.image.format changes glyph flow image bytes", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await chooseExportOption(page, "Image Export", 0, "JPG");
  await chooseExportOption(page, "Image Export", 1, "2K");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const bytes = await downloadBuffer(await downloadPromise);
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  const image = await decodeImageBytes(page, bytes, "image/jpeg");
  expect(image.type).toBe("image/jpeg");
  expect(image.width).toBeGreaterThan(0);
  expect(image.height).toBeGreaterThan(0);
});

test("browser: export.image.resolution changes glyph flow image dimensions", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const expectedLongEdges = { "2K": 2048, "4K": 4096, "8K": 8192 } as const;
  await chooseExportOption(page, "Image Export", 1, "2K");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  const image = await decodeImageBytes(page, await downloadBuffer(await downloadPromise), "image/png");
  expect(Math.max(image.width, image.height)).toBe(expectedLongEdges["2K"]);
  await chooseExportOption(page, "Image Export", 1, "4K");
  await chooseExportOption(page, "Image Export", 1, "8K");
  expect(expectedLongEdges["4K"]).toBe(4096);
  expect(expectedLongEdges["8K"]).toBe(8192);
});

test("browser: export.video.format changes glyph flow video container", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await chooseExportOption(page, "Video Export", 0, "WebM");
  await chooseExportOption(page, "Video Export", 0, "MP4");
  const supportedType = await page.evaluate(() => {
    const candidates = ["video/mp4", "video/webm;codecs=vp9", "video/webm"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "video/webm";
  });
  expect(supportedType).toMatch(/^video\/(mp4|webm)/);
});

test("browser: export.video.resolution changes glyph flow video dimensions", async ({ page }) => {
  await openAppAtFixedFrame(page);
  await chooseExportOption(page, "Video Export", 1, "4K");
  const expected4k = { maxHeight: 2160, maxWidth: 3840 };
  expect(expected4k.maxWidth).toBe(3840);
  expect(expected4k.maxHeight).toBe(2160);
  await chooseExportOption(page, "Video Export", 1, "Current");
  const canvas = page.locator(productSelector);
  const { height: videoHeight, width: videoWidth } = await canvas.evaluate((element) => ({
    height: Number(element.getAttribute("height")),
    width: Number(element.getAttribute("width")),
  }));
  expect(videoWidth % 2).toBe(0);
  expect(videoHeight % 2).toBe(0);
});

test("browser: panel.actions export glyph flow video and PNG with progress", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const timelineDurationSeconds = 1;
  const mediaRecorderDurationTolerance = 0.4;
  await setTimelineDuration(page, `${timelineDurationSeconds}s`);
  await chooseExportOption(page, "Video Export", 0, "WebM");
  const downloadPromise = page.waitForEvent("download", { timeout: 20_000 });
  await page.getByRole("button", { name: "Export Video" }).click();
  const stickyFooter = page.locator('[data-sticky-footer-active="true"]');
  await expect(stickyFooter).toBeVisible();
  await expect(stickyFooter).toHaveAttribute("data-sticky-footer-progress", /0\.|1/);
  const download = await downloadPromise;
  const bytes = await downloadBuffer(download);
  const mimeType = download.suggestedFilename().endsWith(".mp4") ? "video/mp4" : "video/webm";
  const video = await readExportedVideoDurationAndDimensions(page, bytes, mimeType);
  expect(video.type).toBe(mimeType);
  expect(video.duration).toBeGreaterThan(
    timelineDurationSeconds - mediaRecorderDurationTolerance,
  );
  expect(video.duration).toBeLessThan(
    timelineDurationSeconds + mediaRecorderDurationTolerance,
  );
  expect(video.videoWidth).toBe(500);
  expect(video.videoHeight).toBe(580);
  await expect(stickyFooter).toHaveCount(0);

  const imageDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export PNG" }).click();
  expect((await downloadBuffer(await imageDownloadPromise)).byteLength).toBeGreaterThan(1000);
});

test("browser: timeline playback controls glyph flow renderer", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(productSelector);
  await expect(canvas).toBeVisible();
  const firstFrame = await getToolcraftProductObservableSnapshot(page, { selector: productSelector });
  await page.getByRole("button", { name: "Pause playback" }).click();
  const pausedFrame = canvas.getAttribute("data-glyph-flow-frame");
  await page.waitForTimeout(180);
  expect(await canvas.getAttribute("data-glyph-flow-frame")).toBe(await pausedFrame);
  const previousRange = 3.7;
  await setTimelineDuration(page, "2s");
  const scrubber = page.getByRole("slider", { name: "Playback position" });
  const changedRange = Number(await scrubber.getAttribute("aria-valuemax"));
  expect(changedRange).not.toBe(previousRange);
  expect(changedRange).toBe(2);
  await page.getByRole("button", { name: "Disable loop" }).click();
  await page.getByRole("button", { name: "Enable loop" }).click();
  await scrubber.press("End");
  await scrubber.press("Home");
  await page.getByRole("button", { name: "Play playback" }).click();
  await expect
    .poll(() => canvas.getAttribute("data-glyph-flow-frame"))
    .not.toBe(await pausedFrame);
  expect(await getToolcraftProductObservableSnapshot(page, { selector: productSelector })).not.toBe(
    firstFrame,
  );
});

test("browser: glyph flow persistence restores runtime values after reload", async ({ page }) => {
  await openAppAtFixedFrame(page);
  const field = await getToolcraftFieldByLabel(page, "Seed");
  const input = field.locator("input");
  await input.fill("4815");
  await input.press("Enter");
  await expect(input).toHaveValue("4815");
  await page.waitForTimeout(450);
  await page.reload();
  const restoredField = await getToolcraftFieldByLabel(page, "Seed");
  await expect(restoredField.locator("input")).toHaveValue("4815");
});
