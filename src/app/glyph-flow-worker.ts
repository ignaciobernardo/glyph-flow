import { GlyphFlowWebGlRenderer, type GlyphFlowSettings } from "./glyph-flow";

type GlyphFlowWorkerMessage =
  | { canvas: OffscreenCanvas; type: "init" }
  | { height: number; type: "resize"; width: number }
  | { settings: GlyphFlowSettings; type: "render" }
  | { type: "dispose" };

let canvas: OffscreenCanvas | null = null;
let renderer: GlyphFlowWebGlRenderer | null = null;

self.onmessage = (event: MessageEvent<GlyphFlowWorkerMessage>) => {
  const message = event.data;

  if (message.type === "init") {
    canvas = message.canvas;
    renderer = new GlyphFlowWebGlRenderer(canvas);
    return;
  }

  if (message.type === "resize" && canvas) {
    canvas.width = Math.max(1, Math.round(message.width));
    canvas.height = Math.max(1, Math.round(message.height));
    return;
  }

  if (message.type === "render") {
    renderer?.render(message.settings);
    return;
  }

  if (message.type === "dispose") {
    renderer?.dispose(true);
    renderer = null;
    canvas = null;
    self.close();
  }
};
