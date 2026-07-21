import { expect, test } from "@playwright/test";

import {
  expectToolcraftDiscreteSliderDragSmoothness,
  getToolcraftFieldByLabel,
} from "./performance-helpers";

const productSelector = '[data-testid="glyph-flow-canvas"]';

test("browser: Glyph Flow opens as a product Toolcraft shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-slot="toolcraft-runtime-app"]')).toBeVisible();
  await expect(page.getByRole("application", { name: "Canvas viewport" })).toBeVisible();
  await expect(page.locator(productSelector)).toBeVisible();
  await expect(page.getByText("Glyph Field", { exact: true })).toBeVisible();
  await expect(page.getByText("Organic Field", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Play playback|Pause playback/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Export PNG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Video" })).toBeVisible();
});

test("browser: canvas.renderScale changes glyph flow backing pixels", async ({ page }) => {
  await page.goto("/");
  const field = await getToolcraftFieldByLabel(page, "Resolution scale");
  const slider = field.locator('[data-slot="slider"][data-variant="discrete"]');
  await expect(slider).toBeVisible();
  await expect(field.locator('[data-slot="slider-marker"]').first()).toBeVisible();
  await slider.press("Home");
  await expectToolcraftDiscreteSliderDragSmoothness(page, "Resolution scale", {
    maxFrameGapMs: 500,
    maxInteractionMs: 5000,
  });
  await field.getByRole("slider").press("End");
  await expect(field.getByRole("slider")).toHaveAttribute("aria-valuenow", "2");
  await expect
    .poll(() => page.locator(productSelector).evaluate((element) => element.clientWidth))
    .toBe(500);
  await expect
    .poll(() => page.locator(productSelector).evaluate((element) => element.width))
    .toBe(1000);
});
