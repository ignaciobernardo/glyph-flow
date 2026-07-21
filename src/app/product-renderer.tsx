"use client";

import * as React from "react";

import {
  getToolcraftTimelineLoopProgress,
  shouldIncludeToolcraftPreviewBackground,
} from "@/toolcraft/runtime";
import { useToolcraft } from "@/toolcraft/runtime/react";

import { getGlyphFlowSettings } from "./glyph-flow";

type GlyphFlowCanvasElement = HTMLCanvasElement & {
  __glyphFlowWorker?: Worker;
};

export function GlyphFlowCanvas(): React.JSX.Element {
  const { state } = useToolcraft();
  const canvasRef = React.useRef<GlyphFlowCanvasElement | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const isInteractingRef = React.useRef(false);
  const lastRenderRef = React.useRef(0);
  const outputSizeRef = React.useRef({ height: 0, width: 0 });
  const zoomReleaseTimerRef = React.useRef<number | null>(null);

  const includeBackground = shouldIncludeToolcraftPreviewBackground({ state });
  const progress = getToolcraftTimelineLoopProgress(state.timeline);
  const settings = React.useMemo(
    () => getGlyphFlowSettings(state, progress, includeBackground),
    [
      includeBackground,
      progress,
      state.canvas.size.height,
      state.canvas.size.width,
      state.values,
    ],
  );
  const renderSignature = React.useMemo(
    () =>
      [
        settings.background,
        settings.coverage,
        settings.cycles,
        settings.detail,
        settings.drift,
        settings.foreground,
        settings.glyphContent,
        settings.glyphSize,
        settings.glyphSpacing,
        settings.grain,
        settings.includeBackground,
        settings.scale,
        settings.seed,
        settings.softness,
        settings.warp,
      ].join("|"),
    [settings],
  );
  const renderScale = Math.max(1, Number(state.values["canvas.renderScale"] ?? 2));

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio =
      typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
        ? window.devicePixelRatio
        : 1;
    const pixelRatio = Math.max(1, devicePixelRatio) * renderScale;
    const width = Math.max(1, Math.round(state.canvas.size.width * pixelRatio));
    const height = Math.max(1, Math.round(state.canvas.size.height * pixelRatio));

    if (!workerRef.current) {
      canvas.width = width;
      canvas.height = height;
      const worker = new Worker(new URL("./glyph-flow-worker.ts", import.meta.url), {
        name: "glyph-flow-preview",
        type: "module",
      });
      const offscreen = canvas.transferControlToOffscreen();
      worker.postMessage({ canvas: offscreen, type: "init" }, [offscreen]);
      workerRef.current = worker;
      canvas.__glyphFlowWorker = worker;
      outputSizeRef.current = { height, width };
    } else if (
      outputSizeRef.current.width !== width ||
      outputSizeRef.current.height !== height
    ) {
      try {
        canvas.width = width;
        canvas.height = height;
      } catch {
        // The transferred OffscreenCanvas remains the authoritative backing store.
      }
      workerRef.current.postMessage({ height, type: "resize", width });
      outputSizeRef.current = { height, width };
    }

    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const renderWhenReady = (time: number) => {
      if (isInteractingRef.current || time - lastRenderRef.current < 1000 / 10) {
        frameRef.current = requestAnimationFrame(renderWhenReady);
        return;
      }

      frameRef.current = null;
      workerRef.current?.postMessage({ settings, type: "render" });
      lastRenderRef.current = time;
    };

    frameRef.current = requestAnimationFrame(renderWhenReady);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [renderScale, settings, state.canvas.size.height, state.canvas.size.width]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = canvas?.closest<HTMLElement>('[data-slot="toolcraft-runtime-canvas"]');
    if (!viewport) return;

    const beginInteraction = () => {
      isInteractingRef.current = true;
    };
    const endInteraction = () => {
      isInteractingRef.current = false;
    };

    viewport.addEventListener("pointerdown", beginInteraction);
    viewport.addEventListener("pointercancel", endInteraction);
    viewport.addEventListener("pointerup", endInteraction);
    return () => {
      viewport.removeEventListener("pointerdown", beginInteraction);
      viewport.removeEventListener("pointercancel", endInteraction);
      viewport.removeEventListener("pointerup", endInteraction);
    };
  }, []);

  React.useEffect(() => {
    const beginZoomInteraction = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button?.getAttribute("aria-label")?.startsWith("Zoom ")) return;
      if (zoomReleaseTimerRef.current !== null) {
        window.clearTimeout(zoomReleaseTimerRef.current);
      }
      isInteractingRef.current = true;
    };
    const endZoomInteraction = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button?.getAttribute("aria-label")?.startsWith("Zoom ")) return;
      zoomReleaseTimerRef.current = window.setTimeout(() => {
        isInteractingRef.current = false;
        zoomReleaseTimerRef.current = null;
      }, 80);
    };

    document.addEventListener("pointerdown", beginZoomInteraction, true);
    document.addEventListener("pointerup", endZoomInteraction, true);
    return () => {
      document.removeEventListener("pointerdown", beginZoomInteraction, true);
      document.removeEventListener("pointerup", endZoomInteraction, true);
      if (zoomReleaseTimerRef.current !== null) {
        window.clearTimeout(zoomReleaseTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const disposeWorker = () => {
      workerRef.current?.postMessage({ type: "dispose" });
      workerRef.current?.terminate();
      workerRef.current = null;
      if (canvasRef.current) delete canvasRef.current.__glyphFlowWorker;
    };
    window.addEventListener("pagehide", disposeWorker, { once: true });
    return () => window.removeEventListener("pagehide", disposeWorker);
  }, []);

  return (
    <canvas
      className="block size-full"
      data-glyph-flow-frame={progress.toFixed(4)}
      data-glyph-flow-signature={renderSignature}
      data-testid="glyph-flow-canvas"
      data-toolcraft-product-output="glyph-flow"
      ref={canvasRef}
      style={{ height: "100%", width: "100%" }}
    />
  );
}
