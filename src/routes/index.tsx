import { ToolcraftApp } from "@/toolcraft/runtime/react";

import { appSchema } from "../app/app-schema";
import { exportGlyphFlowImage, exportGlyphFlowVideo } from "../app/export";
import { GlyphFlowCanvas } from "../app/product-renderer";

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function AppHome(): React.JSX.Element {
  return (
    <ToolcraftApp
      canvasContent={<GlyphFlowCanvas />}
      className="h-dvh min-h-dvh"
      onPanelAction={async ({ action, reportProgress, state }) => {
        const value = typeof action === "string" ? action : action.value;

        if (value === "export.png") {
          reportProgress(0.1);
          const { blob, extension } = await exportGlyphFlowImage(state);
          reportProgress(0.7);
          downloadBlob(blob, `glyph-flow.${extension}`);
          reportProgress(1);
          return;
        }

        if (value === "export.video") {
          const { blob, mimeType } = await exportGlyphFlowVideo(state, reportProgress);
          const extension = mimeType.includes("mp4") ? "mp4" : "webm";
          downloadBlob(blob, `glyph-flow.${extension}`);
        }
      }}
      renderDefaultCanvasMedia={false}
      schema={appSchema}
    />
  );
}
