import { defineToolcraft } from "@/toolcraft/runtime";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    renderScale: true,
    size: { height: 580, unit: "px", width: 500 },
    sizing: { mode: "editable-output" },
    upload: false,
  },
  panels: {
    controls: {
      sections: [
        {
          controls: {
            content: {
              commitMode: "content",
              defaultValue: "流動形態 SIGNAL NOISE 0123456789 / ",
              description: "The repeating corpus used to build every row of micro-type.",
              label: "Corpus",
              performanceReason:
                "Editing the corpus rebuilds one small cached text texture, then animation reuses it.",
              performanceRole: "responsiveness",
              target: "glyph.content",
              type: "text",
            },
            size: {
              defaultValue: 9,
              description: "Sets the micro-glyph height inside the repeating field.",
              label: "Size",
              max: 20,
              min: 6,
              performanceReason:
                "Glyph size rebuilds the cached text texture without increasing shader cost.",
              performanceRole: "workload",
              step: 1,
              target: "glyph.size",
              type: "slider",
              unit: "px",
            },
            spacing: {
              defaultValue: 11,
              description: "Controls the vertical pitch between typographic rows.",
              label: "Row spacing",
              max: 24,
              min: 8,
              performanceReason:
                "Row spacing rebuilds the small cached text texture without adding GPU passes.",
              performanceRole: "workload",
              step: 1,
              target: "glyph.spacing",
              type: "slider",
              unit: "px",
            },
          },
          title: "Glyph Field",
        },
        {
          controls: {
            scale: {
              defaultValue: 2.4,
              description: "Sets the size of the large organic regions; lower values make broader masses.",
              label: "Scale",
              max: 6,
              min: 0.8,
              performanceReason:
                "Scale changes shader coordinates through one uniform and keeps the same pixel workload.",
              performanceRole: "workload",
              step: 0.1,
              target: "field.scale",
              type: "slider",
            },
            coverage: {
              defaultValue: 54,
              description: "Balances filled type masses against open negative space.",
              label: "Coverage",
              max: 82,
              min: 18,
              performanceReason:
                "Coverage updates the field threshold through one shader uniform.",
              performanceRole: "responsiveness",
              step: 1,
              target: "field.coverage",
              type: "slider",
              unit: "%",
            },
            warp: {
              defaultValue: 0.85,
              description: "Bends the field into irregular lobes and channels.",
              label: "Warp",
              max: 2,
              min: 0,
              performanceReason:
                "Warp changes domain displacement through one shader uniform.",
              performanceRole: "responsiveness",
              step: 0.05,
              target: "field.warp",
              type: "slider",
            },
            softness: {
              defaultValue: 0.045,
              description: "Feathers partial glyphs along the moving field boundary.",
              label: "Edge softness",
              max: 0.16,
              min: 0.005,
              performanceReason:
                "Edge softness adjusts one smooth threshold without changing the render workload.",
              performanceRole: "responsiveness",
              step: 0.005,
              target: "field.softness",
              type: "slider",
            },
            detail: {
              defaultValue: 4,
              description: "Adds progressively finer noise octaves to the moving boundary.",
              label: "Detail",
              markerCount: 5,
              max: 5,
              min: 1,
              performanceReason:
                "Detail directly changes the number of fragment-shader noise octaves per output pixel.",
              performanceRole: "workload",
              step: 1,
              target: "field.detail",
              type: "slider",
              variant: "discrete",
            },
          },
          title: "Organic Field",
        },
        {
          controls: {
            seed: {
              commitMode: "setting",
              defaultValue: "2703",
              description: "Changes the deterministic field and row offsets while preserving the loop.",
              label: "Seed",
              performanceReason:
                "Seed replaces deterministic offsets and rebuilds one small cached text texture.",
              performanceRole: "responsiveness",
              target: "motion.seed",
              type: "text",
            },
            cycles: {
              defaultValue: 1,
              description: "Sets the number of forward field orbits completed in one timeline loop.",
              label: "Cycles",
              markerCount: 4,
              max: 4,
              min: 1,
              performanceReason:
                "Cycles changes timeline phase math but keeps the same shader work per frame.",
              performanceRole: "responsiveness",
              step: 1,
              target: "motion.cycles",
              type: "slider",
              variant: "discrete",
            },
            drift: {
              defaultValue: 0.75,
              description: "Controls how far field features travel around their closed orbit.",
              label: "Drift",
              max: 2,
              min: 0,
              performanceReason:
                "Drift updates a motion uniform without changing fragment count or shader branches.",
              performanceRole: "responsiveness",
              step: 0.05,
              target: "motion.drift",
              type: "slider",
            },
            grain: {
              defaultValue: 35,
              description: "Adds sparse dust and granular breakup around the field edge.",
              label: "Grain",
              max: 100,
              min: 0,
              performanceReason:
                "Grain enables a fixed-cost hash texture already evaluated in the composite shader.",
              performanceRole: "responsiveness",
              step: 1,
              target: "motion.grain",
              type: "slider",
              unit: "%",
            },
          },
          title: "Motion",
        },
        {
          controls: {
            foreground: {
              defaultValue: "#C1C3C2",
              label: "Foreground",
              performanceReason:
                "Foreground updates one shader color uniform without changing geometry or workload.",
              performanceRole: "responsiveness",
              target: "appearance.foreground",
              type: "color",
            },
          },
          title: "Ink",
        },
        {
          controls: {
            includeBackground: {
              defaultValue: true,
              label: "Include",
              performanceReason:
                "Background inclusion changes one compositing branch and PNG alpha behavior.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            background: {
              defaultValue: "#202222",
              label: false,
              performanceReason:
                "Background color updates one shader uniform and the final export fill.",
              performanceRole: "responsiveness",
              target: "appearance.background",
              type: "color",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["includeBackground", "background"],
              layout: "inline",
            },
          ],
          title: "Background",
        },
        {
          controls: {
            imageFormat: {
              defaultValue: "png",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              performanceReason:
                "Image format selects the final encoder without changing the live preview.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            imageResolution: {
              defaultValue: "4k",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              performanceReason:
                "Image resolution changes final exported pixels up to an 8192 px long edge.",
              performanceRole: "workload",
              target: "export.image.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["imageFormat", "imageResolution"],
              layout: "inline",
            },
          ],
          title: "Image Export",
        },
        {
          controls: {
            videoFormat: {
              defaultValue: "mp4",
              label: "Format",
              options: [
                { label: "MP4", value: "mp4" },
                { label: "WebM", value: "webm" },
              ],
              performanceReason:
                "Video format selects a supported browser recording container without changing preview work.",
              performanceRole: "responsiveness",
              target: "export.video.format",
              type: "select",
            },
            videoResolution: {
              defaultValue: "current",
              label: "Resolution",
              options: [
                { label: "Current", value: "current" },
                { label: "4K", value: "4k" },
              ],
              performanceReason:
                "Video resolution changes the number of shader pixels rendered for every encoded frame.",
              performanceRole: "workload",
              target: "export.video.resolution",
              type: "select",
            },
          },
          layoutGroups: [
            {
              columns: 2,
              controls: ["videoFormat", "videoResolution"],
              layout: "inline",
            },
          ],
          title: "Video Export",
        },
        {
          controls: {
            outputActions: {
              actions: [
                {
                  icon: "upload-simple",
                  label: "Export Video",
                  value: "export.video",
                },
                {
                  icon: "upload-simple",
                  label: "Export PNG",
                  value: "export.png",
                  variant: "outline",
                },
              ],
              target: "panel.actions",
              type: "panelActions",
            },
          },
          title: "Export",
        },
      ],
      title: "Glyph Flow",
    },
    timeline: {
      defaultDurationSeconds: 3.7,
      enabled: true,
      mode: "playback",
    },
  },
  persistence: {
    include: ["values", "canvas", "panels", "timeline"],
    key: "toolcraft:glyph-flow:state:v1",
    storage: "localStorage",
    version: 1,
  },
  settingsTransfer: {
    appId: "glyph-flow",
    enabled: "auto",
    fileName: "glyph-flow-settings.json",
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
