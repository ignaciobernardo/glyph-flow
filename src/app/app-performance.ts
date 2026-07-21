import {
  defineToolcraftPerformance,
  type ToolcraftPerformanceConfig,
  type ToolcraftPerformanceScenario,
} from "@/toolcraft/runtime";

const renderScaleWorkloadFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: { renderScale: 2 },
    metric: "custom" as const,
    smoothTarget: { renderScale: 2 },
    smoothTargetRatio: 1,
    target: "canvas.renderScale",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason: "Resolution scale 2 is the maximum live preview backing-pixel multiplier.",
  value: { renderScale: 2 },
};

function responsiveSliderScenario({
  controlLabel,
  id,
  target,
}: {
  controlLabel: string;
  id: string;
  target: string;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: `${id} keeps live slider feedback responsive`,
    browser: true,
    browserTestName: `browser perf: ${id} keeps live slider feedback responsive`,
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000 },
    controlLabel,
    expectedObservable:
      "The real slider thumb moves continuously and the WebGL product canvas changes during the pointer drag.",
    fixture: "Glyph Flow default field at Resolution scale 2",
    id,
    interaction: "control-drag",
    target,
    workload: false,
  };
}

function workloadSliderScenario({
  controlLabel,
  defaultValue,
  id,
  max,
  min,
  target,
}: {
  controlLabel: string;
  defaultValue: number;
  id: string;
  max: number;
  min: number;
  target: string;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: `${id} keeps live slider feedback responsive`,
    browser: true,
    browserTestName: `browser perf: ${id} keeps live slider feedback responsive`,
    budget: { maxFrameGapMs: 120, maxInteractionMs: 1800, maxLongTaskMs: 250 },
    controlLabel,
    expectedObservable:
      "The real workload slider reaches its hard limit and changes WebGL output live at Resolution scale 2.",
    fixture: `Glyph Flow ${controlLabel} hard limit at Resolution scale 2`,
    id,
    interaction: "control-drag",
    stress: true,
    stressFixture: {
      kind: "max-value",
      loadProfile: {
        hardLimit: max,
        metric: "numeric-max",
        smoothTarget: max,
        smoothTargetRatio: 1,
        target,
        userFacingRange: "fully-guaranteed",
      },
      reason: `${max} is the maximum useful ${controlLabel} value exposed by the product.`,
      value: max,
    },
    target,
    values: { default: defaultValue, max, min },
    workload: true,
    workloadFixture: renderScaleWorkloadFixture,
  };
}

function responsiveControlScenario({
  controlLabel,
  id,
  target,
}: {
  controlLabel: string;
  id: string;
  target: string;
}): ToolcraftPerformanceScenario {
  return {
    automated: true,
    automatedTestName: `${id} keeps control changes responsive`,
    browser: true,
    browserTestName: `browser perf: ${id} keeps control changes responsive`,
    budget: { maxFrameGapMs: 120, maxInteractionMs: 900 },
    controlLabel,
    expectedObservable:
      "The visible Toolcraft control updates runtime state and the product or delivery state without freezing the canvas viewport.",
    fixture: "Glyph Flow default field at Resolution scale 2",
    id,
    interaction: "control-change",
    target,
    workload: false,
  };
}

const sliderScenarios = [
  workloadSliderScenario({
    controlLabel: "Size",
    defaultValue: 9,
    id: "glyph-size-drag",
    max: 20,
    min: 6,
    target: "glyph.size",
  }),
  workloadSliderScenario({
    controlLabel: "Row spacing",
    defaultValue: 11,
    id: "glyph-spacing-drag",
    max: 24,
    min: 8,
    target: "glyph.spacing",
  }),
  workloadSliderScenario({
    controlLabel: "Scale",
    defaultValue: 2.4,
    id: "field-scale-drag",
    max: 6,
    min: 0.8,
    target: "field.scale",
  }),
  responsiveSliderScenario({
    controlLabel: "Coverage",
    id: "field-coverage-drag",
    target: "field.coverage",
  }),
  responsiveSliderScenario({ controlLabel: "Warp", id: "field-warp-drag", target: "field.warp" }),
  responsiveSliderScenario({
    controlLabel: "Edge softness",
    id: "field-softness-drag",
    target: "field.softness",
  }),
  responsiveSliderScenario({
    controlLabel: "Cycles",
    id: "motion-cycles-drag",
    target: "motion.cycles",
  }),
  responsiveSliderScenario({ controlLabel: "Drift", id: "motion-drift-drag", target: "motion.drift" }),
  responsiveSliderScenario({ controlLabel: "Grain", id: "motion-grain-drag", target: "motion.grain" }),
] as const;

const controlChangeScenarios = [
  responsiveControlScenario({ controlLabel: "Corpus", id: "glyph-content-change", target: "glyph.content" }),
  responsiveControlScenario({ controlLabel: "Seed", id: "motion-seed-change", target: "motion.seed" }),
  responsiveControlScenario({ controlLabel: "Foreground", id: "foreground-change", target: "appearance.foreground" }),
  responsiveControlScenario({ controlLabel: "Include", id: "include-background-change", target: "export.includeBackground" }),
  responsiveControlScenario({ controlLabel: "Background", id: "background-change", target: "appearance.background" }),
  responsiveControlScenario({ controlLabel: "Format", id: "image-format-change", target: "export.image.format" }),
  responsiveControlScenario({ controlLabel: "Format", id: "video-format-change", target: "export.video.format" }),
] as const;

const detailWorkloadScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "field detail hard limit keeps live shader feedback responsive",
  browser: true,
  browserTestName: "browser perf: field detail hard limit keeps live shader feedback responsive",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 1800, maxLongTaskMs: 250 },
  controlLabel: "Detail",
  expectedObservable:
    "Dragging Detail to five octaves changes boundary pixels live while the GPU frame loop remains responsive.",
  fixture: "Glyph Flow field at the five-octave hard limit",
  id: "field-detail-drag",
  interaction: "control-drag",
  stress: true,
  stressFixture: {
    kind: "max-value",
    loadProfile: {
      hardLimit: 5,
      metric: "numeric-max",
      smoothTarget: 5,
      smoothTargetRatio: 1,
      target: "field.detail",
      userFacingRange: "fully-guaranteed",
    },
    reason: "Five is the highest useful octave count exposed by the product.",
    value: 5,
  },
  target: "field.detail",
  values: { default: 4, max: 5, min: 1 },
  workload: true,
  workloadFixture: renderScaleWorkloadFixture,
};

const imageExportScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "8K glyph flow image export completes within budget",
  browser: true,
  browserTestName: "browser perf: 8K glyph flow image export completes within budget",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
  controlLabel: "Resolution",
  expectedObservable:
    "The 8K PNG export renders the same product at an 8192 pixel long edge and returns encoded bytes.",
  fixture: "Glyph Flow image export at 8K with Resolution scale 2",
  id: "image-export-8k",
  interaction: "control-change",
  stress: true,
  stressFixture: {
    kind: "custom",
    loadProfile: {
      hardLimit: { imageResolution: "8k", renderScale: 2 },
      metric: "custom",
      smoothTarget: { imageResolution: "8k", renderScale: 2 },
      smoothTargetRatio: 1,
      target: "export.image.resolution",
      userFacingRange: "fully-guaranteed",
    },
    reason: "8K and render scale 2 are the maximum still-delivery and preview quality values.",
    value: { imageResolution: "8k", renderScale: 2 },
  },
  target: "export.image.resolution",
  values: { default: "4k", max: "8k", min: "2k" },
  workload: true,
  workloadFixture: {
    kind: "custom",
    loadProfile: {
      hardLimit: { fieldDetail: 5, renderScale: 2 },
      metric: "custom",
      smoothTarget: { fieldDetail: 5, renderScale: 2 },
      smoothTargetRatio: 1,
      target: "renderer.webgl",
      userFacingRange: "fully-guaranteed",
    },
    reason: "Maximum field detail and preview render scale form the heavy app baseline before image resolution changes.",
    value: { fieldDetail: 5, renderScale: 2 },
  },
};

const videoExportScenario: ToolcraftPerformanceScenario = {
  automated: true,
  automatedTestName: "4K glyph flow video export reports frame progress within budget",
  browser: true,
  browserTestName: "browser perf: 4K glyph flow video export reports frame progress within budget",
  budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
  controlLabel: "Resolution",
  expectedObservable:
    "The 4K video path uses even getToolcraftVideoExportSize dimensions and reports progress for rendered frames.",
  fixture: "Glyph Flow short timeline export at 4K and five field octaves",
  id: "video-export-4k",
  interaction: "control-change",
  stress: true,
  stressFixture: {
    kind: "custom",
    loadProfile: {
      hardLimit: { fieldDetail: 5, videoResolution: "4k" },
      metric: "custom",
      smoothTarget: { fieldDetail: 5, videoResolution: "4k" },
      smoothTargetRatio: 1,
      target: "export.video.resolution",
      userFacingRange: "fully-guaranteed",
    },
    reason: "4K and five octaves combine the maximum animated export resolution and shader detail.",
    value: { fieldDetail: 5, videoResolution: "4k" },
  },
  target: "export.video.resolution",
  values: { default: "current", max: "4k", min: "current" },
  workload: true,
  workloadFixture: {
    kind: "custom",
    loadProfile: {
      hardLimit: { fieldDetail: 5, renderScale: 2 },
      metric: "custom",
      smoothTarget: { fieldDetail: 5, renderScale: 2 },
      smoothTargetRatio: 1,
      target: "renderer.webgl",
      userFacingRange: "fully-guaranteed",
    },
    reason: "Maximum field detail and preview render scale form the heavy app baseline before video resolution changes.",
    value: { fieldDetail: 5, renderScale: 2 },
  },
};

const combinedShaderFixture = {
  kind: "custom" as const,
  loadProfile: {
    hardLimit: { fieldDetail: 5, renderScale: 2 },
    metric: "custom" as const,
    smoothTarget: { fieldDetail: 5, renderScale: 2 },
    smoothTargetRatio: 1,
    target: "renderer.webgl",
    userFacingRange: "fully-guaranteed" as const,
  },
  reason: "Five field octaves and Resolution scale 2 are the heaviest useful live preview state.",
  value: { fieldDetail: 5, renderScale: 2 },
};

const rendererScenarios: readonly ToolcraftPerformanceScenario[] = [
  {
    automated: true,
    automatedTestName: "WebGL glyph flow preview renders within budget",
    browser: true,
    browserTestName: "browser perf: WebGL glyph flow preview renders within budget",
    budget: { maxLongTaskMs: 220, maxPreviewMs: 1800, maxRenderMs: 700 },
    expectedObservable: "The full-canvas WebGL field becomes visible at the combined hard limit.",
    fixture: "Glyph Flow preview at five octaves and Resolution scale 2",
    id: "preview-render",
    interaction: "preview-render",
    stress: true,
    stressFixture: combinedShaderFixture,
    target: "renderer.preview",
    values: {
      default: { fieldDetail: 4, renderScale: 2 },
      max: { fieldDetail: 5, renderScale: 2 },
      min: { fieldDetail: 1, renderScale: 1 },
    },
    workload: true,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow animation frames stay within budget",
    browser: true,
    browserTestName: "browser perf: Glyph flow animation frames stay within budget",
    budget: { maxFrameGapMs: 120, maxLongTaskMs: 250 },
    expectedObservable: "At least 120 sampled animation frames advance the procedural field smoothly.",
    fixture: "Glyph Flow playback at five octaves and Resolution scale 2",
    id: "animation-frame",
    interaction: "animation-frame",
    stress: true,
    stressFixture: combinedShaderFixture,
    target: "timeline.playback",
    values: {
      default: { fieldDetail: 4, renderScale: 2 },
      max: { fieldDetail: 5, renderScale: 2 },
      min: { fieldDetail: 1, renderScale: 1 },
    },
    workload: true,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow coalesces animation during viewport drag",
    browser: true,
    browserTestName: "browser perf: Glyph flow coalesces animation during viewport drag",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    expectedObservable:
      "A real canvas drag remains responsive, keeps playback state unchanged, and resumes current timeline output.",
    fixture: "Glyph Flow playback at five octaves and Resolution scale 2 during canvas drag",
    id: "animation-viewport-drag",
    interaction: "animation-viewport-drag",
    stress: true,
    stressFixture: combinedShaderFixture,
    target: "canvas.viewport",
    values: {
      default: { fieldDetail: 4, renderScale: 2 },
      max: { fieldDetail: 5, renderScale: 2 },
      min: { fieldDetail: 1, renderScale: 1 },
    },
    workload: true,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow remains responsive during toolbar zoom stress",
    browser: true,
    browserTestName: "browser perf: Glyph flow remains responsive during toolbar zoom stress",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    expectedObservable:
      "Real toolbar zoom changes canvas viewport scale without rebuilding the cached text texture or shaking offset.",
    fixture: "Glyph Flow playback at five octaves and Resolution scale 2 during zoom",
    id: "viewport-zoom-stress",
    interaction: "viewport-zoom-stress",
    stress: true,
    stressFixture: combinedShaderFixture,
    target: "canvas.zoom",
    values: {
      default: { fieldDetail: 4, renderScale: 2 },
      max: { fieldDetail: 5, renderScale: 2 },
      min: { fieldDetail: 1, renderScale: 1 },
    },
    workload: true,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow timeline playback stays responsive",
    browser: true,
    browserTestName: "browser perf: Glyph flow timeline playback stays responsive",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 2000, maxLongTaskMs: 250 },
    controlLabel: "Play playback",
    expectedObservable: "The real timeline Play/Pause transport changes WebGL frames without delay.",
    fixture: "Glyph Flow default playback timeline",
    id: "timeline-playback",
    interaction: "timeline-playback",
    target: "timeline.playback",
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow timeline scrub stays responsive",
    browser: true,
    browserTestName: "browser perf: Glyph flow timeline scrub stays responsive",
    budget: { maxFrameGapMs: 120, maxInteractionMs: 1800, maxLongTaskMs: 250 },
    controlLabel: "Playback position",
    expectedObservable: "Dragging the real playback handle changes the procedural frame live.",
    fixture: "Glyph Flow expanded playback timeline",
    id: "timeline-scrub",
    interaction: "timeline-scrub",
    target: "timeline.currentTimeSeconds",
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow controls keep the canvas viewport stable",
    browser: true,
    browserTestName: "browser perf: Glyph flow controls keep the canvas viewport stable",
    budget: { maxFrameGapMs: 120 },
    expectedObservable: "Canvas zoom and offset do not jump when a product control changes.",
    fixture: "Glyph Flow default preview and canvas viewport",
    id: "viewport-stability",
    interaction: "viewport-stability",
    target: "canvas.viewport",
    workload: false,
  },
  {
    automated: true,
    automatedTestName: "Glyph flow PNG export action completes within budget",
    browser: true,
    browserTestName: "browser perf: Glyph flow PNG export action completes within budget",
    budget: { maxExportMs: 8000, maxLongTaskMs: 250 },
    expectedObservable:
      "The real sticky Export PNG action resolves encoded product bytes and clears its pending state.",
    fixture: "Glyph Flow PNG export at the default 4K image resolution",
    id: "export-copy",
    interaction: "export-copy",
    target: "panel.actions",
    workload: false,
  },
];

export const appPerformance: ToolcraftPerformanceConfig = defineToolcraftPerformance({
  browserCheckPolicy: {
    fallbackRunner: "playwright",
    fallbackWhen: ["agent-browser-unavailable", "ci"],
    preferredRunner: "agent-browser",
  },
  rendererPipeline: {
    interactionInvalidation: [
      {
        interaction: "control-drag",
        invalidates: ["text-texture", "field-shader", "preview-composite"],
        targets: ["glyph.size", "glyph.spacing"],
      },
      {
        interaction: "control-drag",
        invalidates: ["field-shader", "preview-composite"],
        mustNotInvalidate: ["text-texture"],
        targets: [
          "field.scale",
          "field.coverage",
          "field.warp",
          "field.softness",
          "field.detail",
          "motion.cycles",
          "motion.drift",
          "motion.grain",
        ],
      },
      {
        interaction: "control-change",
        invalidates: ["text-texture", "field-shader", "preview-composite"],
        targets: ["glyph.content", "motion.seed"],
      },
      {
        interaction: "control-change",
        invalidates: ["field-shader", "preview-composite"],
        mustNotInvalidate: ["text-texture"],
        targets: [
          "appearance.foreground",
          "appearance.background",
          "export.includeBackground",
        ],
      },
      {
        interaction: "control-change",
        invalidates: ["export-render"],
        targets: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
      },
      {
        interaction: "animation-frame",
        invalidates: ["field-shader", "preview-composite"],
        mustNotInvalidate: ["text-texture"],
        targets: ["timeline.currentTimeSeconds"],
      },
      {
        interaction: "timeline-playback",
        invalidates: ["field-shader", "preview-composite"],
        mustNotInvalidate: ["text-texture"],
        targets: ["timeline.playback"],
      },
      {
        interaction: "timeline-scrub",
        invalidates: ["field-shader", "preview-composite"],
        mustNotInvalidate: ["text-texture"],
        targets: ["timeline.currentTimeSeconds"],
      },
      {
        interaction: "viewport-drag",
        invalidates: [],
        mustNotInvalidate: ["text-texture", "field-shader"],
        targets: ["canvas.viewport"],
      },
      {
        interaction: "viewport-zoom",
        invalidates: [],
        mustNotInvalidate: ["text-texture", "field-shader"],
        targets: ["canvas.zoom"],
      },
      {
        interaction: "export",
        invalidates: ["export-render"],
        mustNotInvalidate: ["text-texture"],
        targets: ["export.image.resolution", "export.video.resolution"],
      },
    ],
    passes: [
      {
        cacheKey: ["glyph.content", "glyph.size", "glyph.spacing", "motion.seed"],
        id: "text-texture",
        inputs: ["glyph.content", "glyph.size", "glyph.spacing", "motion.seed"],
        invalidatedBy: ["glyph.content", "glyph.size", "glyph.spacing", "motion.seed"],
        kind: "rasterize",
        output: "intermediate",
        quality: "full",
        runsOn: "main",
      },
      {
        cacheKey: [
          "field.scale",
          "field.coverage",
          "field.warp",
          "field.softness",
          "field.detail",
          "motion.cycles",
          "motion.drift",
          "motion.grain",
          "motion.seed",
          "timeline.currentTimeSeconds",
        ],
        id: "field-shader",
        inputs: [
          "text-texture",
          "field.scale",
          "field.coverage",
          "field.warp",
          "field.softness",
          "field.detail",
          "motion.cycles",
          "motion.drift",
          "motion.grain",
          "motion.seed",
          "timeline.currentTimeSeconds",
        ],
        invalidatedBy: [
          "field.scale",
          "field.coverage",
          "field.warp",
          "field.softness",
          "field.detail",
          "motion.cycles",
          "motion.drift",
          "motion.grain",
          "motion.seed",
          "timeline.currentTimeSeconds",
        ],
        kind: "composite",
        output: "intermediate",
        quality: "full",
        runsOn: "gpu",
      },
      {
        cacheKey: [
          "field-shader",
          "appearance.foreground",
          "appearance.background",
          "export.includeBackground",
        ],
        id: "preview-composite",
        inputs: [
          "field-shader",
          "appearance.foreground",
          "appearance.background",
          "export.includeBackground",
        ],
        invalidatedBy: [
          "field-shader",
          "appearance.foreground",
          "appearance.background",
          "export.includeBackground",
        ],
        kind: "composite",
        output: "preview",
        quality: "full",
        runsOn: "gpu",
      },
      {
        id: "export-render",
        inputs: [
          "text-texture",
          "field-shader",
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
        invalidatedBy: [
          "export.image.format",
          "export.image.resolution",
          "export.video.format",
          "export.video.resolution",
        ],
        kind: "export",
        output: "export",
        quality: "export",
        runsOn: "export-only",
      },
    ],
  },
  rendererStrategy: "webgl",
  rendererTechnique: {
    exportRenderer: "webgl",
    fidelityRisks: [
      "Very small glyphs may use different system fallback characters across operating systems, but the cached texture, mask topology, colors, spacing, and deterministic seed remain stable within one browser environment.",
    ],
    intentionalRasterizationReason:
      "The reference intentionally presents micro-type as antialiased pixels that are partially erased by a raster threshold mask; the product output is a pixel composite rather than editable semantic text.",
    layers: [
      {
        content: ["composite"],
        exportMode: "included",
        id: "background",
        kind: "background",
        primitiveCount: "low",
        renderer: "webgl",
      },
      {
        content: ["dense-pattern", "noise", "shader", "text"],
        exportMode: "included",
        id: "glyph-field",
        intentionalRasterizationReason:
          "The full-canvas text texture is partially revealed per pixel by a domain-warped threshold and sparse grain; rasterization is the intended visual result.",
        kind: "product-foreground",
        primitiveCount: "high",
        renderer: "webgl",
        uiSelector: '[data-testid="glyph-flow-canvas"]',
      },
      {
        content: ["composite", "shader"],
        exportMode: "composited",
        id: "export-composite",
        kind: "export-composite",
        primitiveCount: "high",
        renderer: "webgl",
      },
    ],
    performanceRisks: [
      "Five fBm octaves at Resolution scale 2 increase live fragment work, and 4K/8K delivery increases tiled fragment and encoding work; the hard-limit scenarios measure each path without lowering export quality.",
    ],
    previewExportDifferenceReason:
      "Preview shades into a transferred HiDPI OffscreenCanvas in a Web Worker at the source's 10 fps cadence, while export creates tiled WebGL targets at the requested final image/video dimensions; both use the same shader, settings parser, text texture, and explicit timeline progress.",
    previewRenderer: "webgl",
    productRepresentation: "mixed",
    rendererStrategy: "webgl",
    rendererWorkload: "pixel-output",
    sourceRepresentation: "mixed",
    whyNotAlternativeStrategies: [
      "DOM and SVG would need thousands of independently clipped glyph fragments and cannot efficiently reproduce partial-glyph domain-warped mask edges on every animation frame.",
      "Canvas 2D remains useful for the cached text texture and export tile assembly, but main-thread per-pixel fBm/domain warp at preview or 8K dimensions would repeat expensive UI-thread work; Worker-owned WebGL keeps the live procedural field isolated.",
      "WebGPU was considered but WebGL2 has broader browser support and is sufficient for one fullscreen fragment pass with a cached luminance texture.",
    ],
  },
  rendererWorkload: "pixel-output",
  scenarios: [
    ...sliderScenarios,
    detailWorkloadScenario,
    ...controlChangeScenarios,
    ...rendererScenarios,
    imageExportScenario,
    videoExportScenario,
  ],
  usesCustomRenderer: true,
  workloadTargets: [
    "glyph.size",
    "glyph.spacing",
    "field.scale",
    "field.detail",
    "export.image.resolution",
    "export.video.resolution",
  ],
});
