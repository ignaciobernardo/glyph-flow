import {
  createToolcraftPngExportCanvas,
  getToolcraftImageExportSize,
  getToolcraftTimelineLoopProgress,
  getToolcraftVideoExportSize,
  shouldIncludeToolcraftExportBackground,
} from "@/toolcraft/runtime";
import type { ToolcraftState } from "@/toolcraft/runtime";

import { getGlyphFlowSettings, GlyphFlowWebGlRenderer } from "./glyph-flow";

export type GlyphFlowImageExportResult = {
  blob: Blob;
  extension: "jpg" | "png";
  mimeType: "image/jpeg" | "image/png";
};

function exportGlyphFlowImageInWorker(options: {
  height: number;
  mimeType: "image/jpeg" | "image/png";
  quality?: number;
  settings: ReturnType<typeof getGlyphFlowSettings>;
  width: number;
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./glyph-flow-image-worker.ts", import.meta.url), {
      name: "glyph-flow-image-export",
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<{ blob?: Blob; type: string }>) => {
      if (event.data.type !== "complete" || !event.data.blob) return;
      worker.terminate();
      resolve(event.data.blob);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event.error ?? new Error(event.message));
    };
    worker.postMessage({ ...options, type: "export" });
  });
}

export async function exportGlyphFlowImage(
  state: ToolcraftState,
): Promise<GlyphFlowImageExportResult> {
  const requestedFormat = String(state.values["export.image.format"] ?? "png").toLowerCase();
  const isJpg = requestedFormat === "jpg" || requestedFormat === "jpeg";
  const includeBackground =
    isJpg ||
    (shouldIncludeToolcraftExportBackground({ format: "png", schema: state.schema }) &&
      Boolean(state.values["export.includeBackground"] ?? true));
  const progress = getToolcraftTimelineLoopProgress(state.timeline);
  const background = String(state.values["appearance.background"] ?? "#202222");

  const imageResolution = state.values["export.image.resolution"] as string | undefined;
  const { height: pixelHeight, width: pixelWidth } = getToolcraftImageExportSize({
    resolution: imageResolution,
    state,
  });
  const canvas = createToolcraftPngExportCanvas({
    background,
    includeBackground,
    render: () => undefined,
    resolution: imageResolution,
    state,
  });
  const mimeType = isJpg ? "image/jpeg" : "image/png";
  const settings = getGlyphFlowSettings(state, progress, includeBackground);
  if (typeof Worker === "function" && typeof OffscreenCanvas === "function") {
    const blob = await exportGlyphFlowImageInWorker({
      height: pixelHeight,
      mimeType,
      quality: isJpg ? 0.94 : undefined,
      settings,
      width: pixelWidth,
    });
    return { blob, extension: isJpg ? "jpg" : "png", mimeType };
  }

  const offscreenCanvas =
    typeof OffscreenCanvas === "function"
      ? new OffscreenCanvas(canvas.width, canvas.height)
      : null;
  const context = offscreenCanvas?.getContext("2d") ?? canvas.getContext("2d");
  if (!context) {
    throw new Error("Glyph Flow could not create the image export surface.");
  }

  const renderCanvas = document.createElement("canvas");
  renderCanvas.width = pixelWidth;
  const maxPixelsPerTile = 180_000;
  const tileHeight = Math.min(
    pixelHeight,
    Math.max(64, Math.min(256, Math.floor(maxPixelsPerTile / pixelWidth))),
  );
  renderCanvas.height = tileHeight;
  const renderer = new GlyphFlowWebGlRenderer(renderCanvas, {
    preserveDrawingBuffer: true,
  });
  try {
    for (let offsetY = 0; offsetY < pixelHeight; offsetY += tileHeight) {
      const currentTileHeight = Math.min(tileHeight, pixelHeight - offsetY);
      if (renderCanvas.height !== currentTileHeight) {
        renderCanvas.height = currentTileHeight;
      }
      renderer.render(settings, {
        offsetY,
        outputHeight: pixelHeight,
        outputWidth: pixelWidth,
      });
      const bitmap = await createImageBitmap(renderCanvas);
      try {
        context.drawImage(bitmap, 0, offsetY, pixelWidth, currentTileHeight);
      } finally {
        bitmap.close();
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
  } finally {
    renderer.dispose(true);
  }

  const blob = offscreenCanvas
    ? await offscreenCanvas.convertToBlob({
        quality: isJpg ? 0.94 : undefined,
        type: mimeType,
      })
    : await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (encodedBlob) => {
            if (encodedBlob) resolve(encodedBlob);
            else reject(new Error("Glyph Flow could not encode the image export."));
          },
          mimeType,
          isJpg ? 0.94 : undefined,
        );
      });

  return {
    blob,
    extension: isJpg ? "jpg" : "png",
    mimeType,
  };
}

const preferredVideoMimeTypes: Record<string, readonly string[]> = {
  mp4: [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ],
  webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
};

export function getGlyphFlowVideoMimeType(format: string): string {
  const candidates = preferredVideoMimeTypes[format.toLowerCase()] ?? preferredVideoMimeTypes.webm!;

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "video/webm";
}

export type GlyphFlowVideoExportResult = {
  blob: Blob;
  height: number;
  mimeType: string;
  width: number;
};

const exportFramesPerSecond = 10;

type GlyphFlowVideoTrackGenerator = MediaStreamTrack & {
  writable: WritableStream<VideoFrame>;
};

type GlyphFlowVideoTrackGeneratorConstructor = new (options: {
  kind: "video";
}) => GlyphFlowVideoTrackGenerator;

export async function exportGlyphFlowVideo(
  state: ToolcraftState,
  onProgress?: (progress: number) => void,
): Promise<GlyphFlowVideoExportResult> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Glyph Flow video export requires MediaRecorder support.");
  }

  const { height, width } = getToolcraftVideoExportSize({
    resolution: state.values["export.video.resolution"] as string | undefined,
    state,
  });
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const format = String(state.values["export.video.format"] ?? "mp4");
  const mimeType = getGlyphFlowVideoMimeType(format);
  const durationSeconds = Math.max(0.1, state.timeline.durationSeconds);
  const totalFrames = Math.max(1, Math.round(durationSeconds * exportFramesPerSecond));
  const frameDurationMs = 1000 / exportFramesPerSecond;
  const generatorConstructor = (
    globalThis as typeof globalThis & {
      MediaStreamTrackGenerator?: GlyphFlowVideoTrackGeneratorConstructor;
    }
  ).MediaStreamTrackGenerator;
  const supportsTimestampedFrames =
    typeof generatorConstructor === "function" && typeof VideoFrame !== "undefined";
  const generatedTrack = supportsTimestampedFrames
    ? new generatorConstructor({ kind: "video" })
    : null;
  const stream = generatedTrack
    ? new MediaStream([generatedTrack])
    : canvas.captureStream(exportFramesPerSecond);
  const [videoTrack] = stream.getVideoTracks();
  const requestFrame = generatedTrack
    ? undefined
    : (videoTrack as MediaStreamTrack & { requestFrame?: () => void })?.requestFrame;

  if (!videoTrack || (!generatedTrack && typeof requestFrame !== "function")) {
    throw new Error(
      "Glyph Flow video export requires timestamped VideoFrame or canvas requestFrame support.",
    );
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const renderer = new GlyphFlowWebGlRenderer(canvas, { preserveDrawingBuffer: true });
  let generatedWriter: WritableStreamDefaultWriter<VideoFrame> | null = null;
  const chunks: BlobPart[] = [];
  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    recorder.onerror = (event) => {
      reject(
        event instanceof ErrorEvent
          ? event.error
          : new Error("Glyph Flow video recorder failed."),
      );
    };
    recorder.onstop = () => {
      if (chunks.length === 0) {
        reject(new Error("Glyph Flow video export produced no encoded data."));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  recorder.start();
  await new Promise((resolve) => window.setTimeout(resolve, 120));
  try {
    if (generatedTrack) {
      generatedWriter = generatedTrack.writable.getWriter();
      const frameSequenceStartedAt = performance.now();
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        const targetTime = frameSequenceStartedAt + frameIndex * frameDurationMs;
        const waitMs = targetTime - performance.now();
        if (waitMs > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }
        const progress = frameIndex / totalFrames;
        renderer.render(getGlyphFlowSettings(state, progress, true));
        const frame = new VideoFrame(canvas, {
          duration: Math.round(frameDurationMs * 1000),
          timestamp: Math.round(frameIndex * frameDurationMs * 1000),
        });
        try {
          await generatedWriter.write(frame);
        } finally {
          frame.close();
        }
        onProgress?.((frameIndex + 1) / totalFrames);
      }
      const remainingDurationMs =
        frameSequenceStartedAt + durationSeconds * 1000 - performance.now();
      if (remainingDurationMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDurationMs));
      }
    } else {
      renderer.render(getGlyphFlowSettings(state, 0, true));
      const recordingStartedAt = performance.now();
      requestFrame!.call(videoTrack);
      onProgress?.(1 / totalFrames);
      for (let frameIndex = 1; frameIndex < totalFrames; frameIndex += 1) {
        const targetTime = recordingStartedAt + frameIndex * frameDurationMs;
        const waitMs = targetTime - performance.now();
        if (waitMs > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, waitMs));
        }
        const progress = frameIndex / totalFrames;
        renderer.render(getGlyphFlowSettings(state, progress, true));
        requestFrame!.call(videoTrack);
        onProgress?.((frameIndex + 1) / totalFrames);
      }

      const remainingDurationMs =
        recordingStartedAt + durationSeconds * 1000 - performance.now();
      if (remainingDurationMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDurationMs));
      }
    }
  } finally {
    renderer.dispose(true);
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  const blob = await recordingDone;
  await generatedWriter?.close().catch(() => undefined);
  videoTrack.stop();
  onProgress?.(1);

  return { blob, height, mimeType, width };
}
