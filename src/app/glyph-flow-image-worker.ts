import { GlyphFlowWebGlRenderer, type GlyphFlowSettings } from "./glyph-flow";

type GlyphFlowImageWorkerRequest = {
  height: number;
  mimeType: "image/jpeg" | "image/png";
  quality?: number;
  settings: GlyphFlowSettings;
  type: "export";
  width: number;
};

self.onmessage = async (event: MessageEvent<GlyphFlowImageWorkerRequest>) => {
  const { height, mimeType, quality, settings, width } = event.data;
  const outputCanvas = new OffscreenCanvas(width, height);
  const context = outputCanvas.getContext("2d");
  if (!context) throw new Error("Glyph Flow could not create the worker export surface.");

  const maxPixelsPerTile = 180_000;
  const tileHeight = Math.min(
    height,
    Math.max(48, Math.min(192, Math.floor(maxPixelsPerTile / width))),
  );
  const renderCanvas = new OffscreenCanvas(width, tileHeight);
  const renderer = new GlyphFlowWebGlRenderer(renderCanvas, {
    preserveDrawingBuffer: true,
  });

  try {
    for (let offsetY = 0; offsetY < height; offsetY += tileHeight) {
      const currentTileHeight = Math.min(tileHeight, height - offsetY);
      if (renderCanvas.height !== currentTileHeight) renderCanvas.height = currentTileHeight;
      renderer.render(settings, { offsetY, outputHeight: height, outputWidth: width });
      const bitmap = renderCanvas.transferToImageBitmap();
      try {
        context.drawImage(bitmap, 0, offsetY, width, currentTileHeight);
      } finally {
        bitmap.close();
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }

    const blob = await outputCanvas.convertToBlob({ quality, type: mimeType });
    self.postMessage({ blob, type: "complete" });
  } finally {
    renderer.dispose(true);
    self.close();
  }
};
