import { describe, expect, it } from "vitest";

import {
  createToolcraftState,
  getToolcraftImageExportSize,
  getToolcraftTimelineLoopProgress,
  getToolcraftVideoExportSize,
  type ToolcraftState,
} from "@/toolcraft/runtime";

import { appSchema } from "./app-schema";
import { getGlyphFlowVideoMimeType } from "./export";
import { getGlyphFlowSettings, hashGlyphFlowSeed, hexToRgb } from "./glyph-flow";

function makeState(values: Record<string, unknown> = {}): ToolcraftState {
  const state = createToolcraftState(appSchema);
  return { ...state, values: { ...state.values, ...values } };
}

function settings(values: Record<string, unknown> = {}) {
  return getGlyphFlowSettings(makeState(values), 0.37, true);
}

function expectSettingChange(
  target: string,
  value: unknown,
  select: (value: ReturnType<typeof settings>) => unknown,
): void {
  expect(select(settings({ [target]: value }))).not.toEqual(select(settings()));
}

describe("Glyph Flow product behavior", () => {
  it("canvas.renderScale changes glyph flow backing pixels", () => {
    expect(appSchema.canvas.renderScale).toMatchObject({ defaultValue: 2, enabled: true });
  });

  it("glyph.content changes glyph flow product output", () => {
    expectSettingChange("glyph.content", "ALT / GLYPHS / 808", (value) => value.glyphContent);
  });

  it("glyph.size changes glyph flow product output", () => {
    expectSettingChange("glyph.size", 16, (value) => value.glyphSize);
  });

  it("glyph.spacing changes glyph flow product output", () => {
    expectSettingChange("glyph.spacing", 19, (value) => value.glyphSpacing);
  });

  it("field.scale changes glyph flow product output", () => {
    expectSettingChange("field.scale", 5.4, (value) => value.scale);
  });

  it("field.coverage changes glyph flow product output", () => {
    expectSettingChange("field.coverage", 72, (value) => value.coverage);
  });

  it("field.warp changes glyph flow product output", () => {
    expectSettingChange("field.warp", 1.8, (value) => value.warp);
  });

  it("field.detail changes glyph flow product output", () => {
    expectSettingChange("field.detail", 2, (value) => value.detail);
  });

  it("field.softness changes glyph flow product output", () => {
    expectSettingChange("field.softness", 0.13, (value) => value.softness);
  });

  it("motion.cycles changes glyph flow product output", () => {
    expectSettingChange("motion.cycles", 4, (value) => value.cycles);
  });

  it("motion.drift changes glyph flow product output", () => {
    expectSettingChange("motion.drift", 1.6, (value) => value.drift);
  });

  it("motion.grain changes glyph flow product output", () => {
    expectSettingChange("motion.grain", 88, (value) => value.grain);
  });

  it("motion.seed changes glyph flow product output", () => {
    expect(hashGlyphFlowSeed("SIGNAL")).toBe(hashGlyphFlowSeed("SIGNAL"));
    expect(hashGlyphFlowSeed("SIGNAL")).not.toBe(hashGlyphFlowSeed("NOISE"));
    expectSettingChange("motion.seed", "4815", (value) => value.seed);
  });

  it("appearance.foreground changes glyph flow product output", () => {
    expectSettingChange("appearance.foreground", "#FF3366", (value) => value.foreground);
    expect(hexToRgb("#FF0000")).toEqual([1, 0, 0]);
  });

  it("export.includeBackground hides preview background and makes transparent PNG output", () => {
    const withBackground = getGlyphFlowSettings(makeState(), 0.2, true);
    const transparent = getGlyphFlowSettings(makeState(), 0.2, false);
    expect(withBackground.includeBackground).toBe(true);
    expect(transparent.includeBackground).toBe(false);
  });

  it("appearance.background changes glyph flow product output", () => {
    expectSettingChange("appearance.background", "#151225", (value) => value.background);
  });

  it("export.image.format changes glyph flow image bytes", () => {
    const section = appSchema.panels.controls?.sections.find(
      (candidate) => candidate.title === "Image Export",
    );
    expect(section?.controls.imageFormat?.options?.map((option) => option.value)).toEqual([
      "png",
      "jpg",
    ]);
  });

  it("export.image.resolution changes glyph flow image dimensions", () => {
    const state = makeState();
    expect(getToolcraftImageExportSize({ resolution: "2k", state }).height).toBe(2048);
    expect(getToolcraftImageExportSize({ resolution: "4k", state }).height).toBe(4096);
    expect(getToolcraftImageExportSize({ resolution: "8k", state }).height).toBe(8192);
  });

  it("export.video.format changes glyph flow video container", () => {
    expect(getGlyphFlowVideoMimeType("mp4")).toBe("video/webm");
    expect(getGlyphFlowVideoMimeType("webm")).toBe("video/webm");
  });

  it("export.video.resolution changes glyph flow video dimensions", () => {
    const state = makeState();
    expect(getToolcraftVideoExportSize({ resolution: "current", state })).toMatchObject({
      height: 580,
      width: 500,
    });
    const fourK = getToolcraftVideoExportSize({ resolution: "4k", state });
    expect(fourK.height).toBe(2160);
    expect(fourK.width % 2).toBe(0);
  });

  it("panel.actions export glyph flow video and PNG with progress", () => {
    const actionControl = appSchema.panels.controls?.sections
      .flatMap((section) => Object.values(section.controls))
      .find((control) => control.type === "panelActions");
    expect(actionControl?.type).toBe("panelActions");
    if (actionControl?.type === "panelActions") {
      expect((actionControl.actions ?? []).map((action) => (typeof action === "string" ? action : action.value))).toEqual([
        "export.png",
        "export.video",
      ]);
    }
  });

  it("connects timeline playback controls to glyph flow renderer", () => {
    const state = makeState();
    const start = getToolcraftTimelineLoopProgress({ ...state.timeline, currentTimeSeconds: 0 });
    const wrapped = getToolcraftTimelineLoopProgress({
      ...state.timeline,
      currentTimeSeconds: state.timeline.durationSeconds,
    });
    expect(start).toBe(0);
    expect(wrapped).toBe(0);
    expect(settings().progress).toBeCloseTo(0.37);
  });

  it("glyph flow persistence restores runtime values after reload", () => {
    expect(appSchema.persistence).toMatchObject({
      include: ["values", "canvas", "panels", "timeline"],
      storage: "localStorage",
    });
  });
});
