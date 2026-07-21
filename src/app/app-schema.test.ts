import { describe, expect, it } from "vitest";

import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("publishes the Glyph Flow Toolcraft product contract", () => {
    expect(appSchema.canvas.draggable).toBe(true);
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.renderScale).toMatchObject({
      defaultValue: 2,
      enabled: true,
    });
    expect(appSchema.canvas.sizing).toEqual({ mode: "editable-output" });
    expect(appSchema.canvas.upload).toBe(false);
    expect(appSchema.panels.controls?.sections[0]?.title).toBe("Setup");
    expect(appSchema.panels.controls?.sections[0]?.controls.settingsTransfer).toMatchObject({
      target: "runtime.settingsTransfer",
      type: "settingsTransfer",
    });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.panels.timeline).toMatchObject({
      defaultDurationSeconds: 3.7,
      enabled: true,
      mode: "playback",
    });
    expect(appSchema.assembly.components).toEqual(
      expect.arrayContaining(["canvas", "controlsPanel", "timelinePanel", "toolbar"]),
    );
    expect(appSchema.assembly.capabilities).toEqual(
      expect.arrayContaining([
        "canvas.editableSize",
        "canvas.renderScale",
        "controls.panel",
        "timeline.playback",
        "toolbar.zoom",
      ]),
    );
  });

  it("keeps product controls grouped by visible entity", () => {
    expect(appSchema.panels.controls?.sections.map((section) => section.title)).toEqual([
      "Setup",
      "Glyph Field",
      "Organic Field",
      "Motion",
      "Ink",
      "Background",
      "Image Export",
      "Video Export",
      "Export",
    ]);
  });

  it("connects the runtime playback timeline to a 3.7 second loop", () => {
    expect(appSchema.assembly.capabilities).toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
    expect(appSchema.assembly.commands).toEqual(
      expect.arrayContaining([
        "timeline.setCurrentTime",
        "timeline.setDuration",
        "timeline.togglePlayback",
      ]),
    );
  });

  it("declares workload coverage for the custom WebGL product", () => {
    expect(appPerformance.usesCustomRenderer).toBe(true);
    expect(appPerformance.scenarios).toHaveLength(27);
    expect(appPerformance.workloadTargets).toEqual(
      expect.arrayContaining([
        "glyph.size",
        "glyph.spacing",
        "field.scale",
        "field.detail",
        "export.image.resolution",
        "export.video.resolution",
      ]),
    );
  });
});
