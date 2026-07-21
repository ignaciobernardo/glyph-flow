import type { ToolcraftState } from "@/toolcraft/runtime";

export type GlyphFlowSettings = {
  background: string;
  coverage: number;
  cycles: number;
  detail: number;
  drift: number;
  foreground: string;
  glyphContent: string;
  glyphSize: number;
  glyphSpacing: number;
  grain: number;
  includeBackground: boolean;
  logicalHeight: number;
  logicalWidth: number;
  progress: number;
  scale: number;
  seed: number;
  softness: number;
  warp: number;
};

type GlyphFlowRenderCanvas = HTMLCanvasElement | OffscreenCanvas;

function createGlyphFlowRasterCanvas(width = 1, height = 1): GlyphFlowRenderCanvas {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function hashGlyphFlowSeed(value: unknown): number {
  const source = String(value ?? "2703").trim() || "2703";
  const numeric = Number(source);

  if (Number.isFinite(numeric)) {
    return Math.abs(numeric) % 65536;
  }

  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) % 65536;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberValue(state: ToolcraftState, target: string, fallback: number): number {
  const value = Number(state.values[target]);
  return Number.isFinite(value) ? value : fallback;
}

export function getGlyphFlowSettings(
  state: ToolcraftState,
  progress: number,
  includeBackground: boolean,
): GlyphFlowSettings {
  return {
    background: String(state.values["appearance.background"] ?? "#202222"),
    coverage: clamp(numberValue(state, "field.coverage", 54) / 100, 0, 1),
    cycles: clamp(Math.round(numberValue(state, "motion.cycles", 1)), 1, 4),
    detail: clamp(Math.round(numberValue(state, "field.detail", 4)), 1, 5),
    drift: clamp(numberValue(state, "motion.drift", 0.75), 0, 2),
    foreground: String(state.values["appearance.foreground"] ?? "#C1C3C2"),
    glyphContent: String(
      state.values["glyph.content"] ?? "流動形態 SIGNAL NOISE 0123456789 / ",
    ),
    glyphSize: clamp(numberValue(state, "glyph.size", 9), 6, 20),
    glyphSpacing: clamp(numberValue(state, "glyph.spacing", 11), 8, 24),
    grain: clamp(numberValue(state, "motion.grain", 35) / 100, 0, 1),
    includeBackground,
    logicalHeight: Math.max(1, state.canvas.size.height),
    logicalWidth: Math.max(1, state.canvas.size.width),
    progress: ((progress % 1) + 1) % 1,
    scale: clamp(numberValue(state, "field.scale", 2.4), 0.8, 6),
    seed: hashGlyphFlowSeed(state.values["motion.seed"]),
    softness: clamp(numberValue(state, "field.softness", 0.045), 0.005, 0.16),
    warp: clamp(numberValue(state, "field.warp", 0.85), 0, 2),
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace(/^#/, "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded.slice(0, 6), 16);

  if (!Number.isFinite(value) || expanded.length < 6) {
    return [0, 0, 0];
  }

  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uTextTexture;
uniform sampler2D uNoiseTexture;
uniform vec2 uResolution;
uniform vec2 uOutputSize;
uniform vec2 uTileOffset;
uniform vec2 uLogicalSize;
uniform vec2 uTextTextureSize;
uniform vec3 uBackground;
uniform vec3 uForeground;
uniform float uCoverage;
uniform float uCycles;
uniform float uDetail;
uniform float uDrift;
uniform float uGrain;
uniform float uIncludeBackground;
uniform float uProgress;
uniform float uScale;
uniform float uSeed;
uniform float uSoftness;
uniform float uWarp;

const float TAU = 6.28318530718;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32 + uSeed * 0.001);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  return texture(uNoiseTexture, (p + 0.5) / 256.0).r;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.56;
  mat2 rotateScale = mat2(1.72, 1.05, -1.05, 1.72);

  for (int octave = 0; octave < 5; octave += 1) {
    if (float(octave) >= uDetail) {
      break;
    }
    value += valueNoise(p) * amplitude;
    p = rotateScale * p + vec2(7.13, 3.71);
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  float theta = uProgress * TAU * uCycles;
  vec2 orbit = vec2(cos(theta), sin(theta));
  vec2 aspect = vec2(uLogicalSize.x / max(uLogicalSize.y, 1.0), 1.0);
  vec2 outputPixel = uTileOffset + vec2(vUv.x, 1.0 - vUv.y) * uResolution;
  vec2 outputUv = vec2(
    outputPixel.x / max(uOutputSize.x, 1.0),
    1.0 - outputPixel.y / max(uOutputSize.y, 1.0)
  );
  vec2 position = (outputUv - 0.5) * aspect * uScale * 2.1;
  vec2 seedOffset = vec2(uSeed * 0.0071, uSeed * 0.0113);
  vec2 motionOffset = orbit * uDrift;

  vec2 warpPosition = position * 0.72 + seedOffset + motionOffset;
  vec2 warpLow = texture(uNoiseTexture, (warpPosition + 0.5) / 256.0).rg;
  vec2 warpHigh = texture(
    uNoiseTexture,
    (warpPosition * 2.03 + vec2(5.7, -3.4) + 0.5) / 256.0
  ).ba;
  vec2 warpVector = warpLow * 0.68 + warpHigh * 0.32;
  vec2 warped = position + (warpVector - 0.5) * uWarp * 2.8;
  float field = fbm(warped + motionOffset * 1.35 + seedOffset * 0.21);

  float threshold = mix(0.80, 0.28, uCoverage);
  float mask = smoothstep(threshold - uSoftness, threshold + uSoftness, field);
  float edge = 1.0 - smoothstep(0.03, 0.24, abs(field - threshold));

  vec2 logicalPixel = vec2(outputUv.x, 1.0 - outputUv.y) * uLogicalSize;
  vec2 textUv = logicalPixel / max(uTextTextureSize, vec2(1.0));
  float glyph = texture(uTextTexture, textUv).a;

  vec2 grainCell = floor(outputPixel * 0.58);
  float randomValue = hash21(grainCell + orbit * 41.0);
  float dustGate = step(1.0 - uGrain * (0.035 + edge * 0.13), randomValue);
  float dust = dustGate * mix(0.18, 0.72, edge);
  float fineGrain = (randomValue - 0.5) * uGrain * 0.08;
  float ink = clamp(glyph * max(mask + fineGrain, dust), 0.0, 1.0);

  if (uIncludeBackground > 0.5) {
    vec3 color = mix(uBackground, uForeground, ink);
    outColor = vec4(color, 1.0);
  } else {
    outColor = vec4(uForeground, ink);
  }
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Glyph Flow could not create a WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error.";
    gl.deleteShader(shader);
    throw new Error(`Glyph Flow shader compile failed: ${message}`);
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Glyph Flow could not create a WebGL program.");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown shader link error.";
    gl.deleteProgram(program);
    throw new Error(`Glyph Flow shader link failed: ${message}`);
  }

  return program;
}

type TextTexture = {
  height: number;
  key: string;
  width: number;
};

export class GlyphFlowWebGlRenderer {
  private readonly buffer: WebGLBuffer;
  private readonly canvas: GlyphFlowRenderCanvas;
  private readonly gl: WebGL2RenderingContext;
  private readonly noiseTexture: WebGLTexture;
  private readonly program: WebGLProgram;
  private readonly textTexture: WebGLTexture;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>();
  private textTextureInfo: TextTexture | null = null;

  constructor(
    canvas: GlyphFlowRenderCanvas,
    options: { preserveDrawingBuffer?: boolean } = {},
  ) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      premultipliedAlpha: false,
      stencil: false,
    }) as WebGL2RenderingContext | null;

    if (!gl) {
      throw new Error("Glyph Flow requires a browser with WebGL2 support.");
    }

    this.canvas = canvas;
    this.gl = gl;
    this.program = createProgram(gl);

    const buffer = gl.createBuffer();
    if (!buffer) {
      throw new Error("Glyph Flow could not create its fullscreen geometry.");
    }
    this.buffer = buffer;

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const positionLocation = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texture = gl.createTexture();
    if (!texture) {
      throw new Error("Glyph Flow could not create its text texture.");
    }
    this.textTexture = texture;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const noiseTexture = gl.createTexture();
    if (!noiseTexture) {
      throw new Error("Glyph Flow could not create its procedural noise texture.");
    }
    this.noiseTexture = noiseTexture;
    const noiseSize = 256;
    const noisePixels = new Uint8Array(noiseSize * noiseSize * 4);
    let noiseState = 0x9e3779b9;
    for (let index = 0; index < noiseSize * noiseSize; index += 1) {
      noiseState ^= noiseState << 13;
      noiseState ^= noiseState >>> 17;
      noiseState ^= noiseState << 5;
      const pixelIndex = index * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        noiseState ^= noiseState << 13;
        noiseState ^= noiseState >>> 17;
        noiseState ^= noiseState << 5;
        noisePixels[pixelIndex + channel] = noiseState >>> 24;
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      noiseSize,
      noiseSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      noisePixels,
    );

  }

  dispose(loseContext = false): void {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteTexture(this.noiseTexture);
    this.gl.deleteTexture(this.textTexture);
    this.gl.deleteProgram(this.program);
    if (loseContext) {
      this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  }

  render(
    settings: GlyphFlowSettings,
    viewport: {
      offsetX?: number;
      offsetY?: number;
      outputHeight?: number;
      outputWidth?: number;
    } = {},
  ): void {
    const gl = this.gl;
    this.ensureTextTexture(settings);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);

    this.uniform1f("uCoverage", settings.coverage);
    this.uniform1f("uCycles", settings.cycles);
    this.uniform1f("uDetail", settings.detail);
    this.uniform1f("uDrift", settings.drift);
    this.uniform1f("uGrain", settings.grain);
    this.uniform1f("uIncludeBackground", settings.includeBackground ? 1 : 0);
    this.uniform1f("uProgress", settings.progress);
    this.uniform1f("uScale", settings.scale);
    this.uniform1f("uSeed", settings.seed);
    this.uniform1f("uSoftness", settings.softness);
    this.uniform1f("uWarp", settings.warp);
    this.uniform2f("uResolution", this.canvas.width, this.canvas.height);
    this.uniform2f(
      "uOutputSize",
      viewport.outputWidth ?? this.canvas.width,
      viewport.outputHeight ?? this.canvas.height,
    );
    this.uniform2f("uTileOffset", viewport.offsetX ?? 0, viewport.offsetY ?? 0);
    this.uniform2f("uLogicalSize", settings.logicalWidth, settings.logicalHeight);
    this.uniform2f(
      "uTextTextureSize",
      this.textTextureInfo?.width ?? 1,
      this.textTextureInfo?.height ?? 1,
    );

    const [backgroundR, backgroundG, backgroundB] = hexToRgb(settings.background);
    const [foregroundR, foregroundG, foregroundB] = hexToRgb(settings.foreground);
    this.uniform3f("uBackground", backgroundR, backgroundG, backgroundB);
    this.uniform3f("uForeground", foregroundR, foregroundG, foregroundB);

    gl.uniform1i(this.getUniformLocation("uTextTexture"), 0);
    gl.uniform1i(this.getUniformLocation("uNoiseTexture"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private ensureTextTexture(settings: GlyphFlowSettings): void {
    const content = settings.glyphContent.trim() || "GLYPH FLOW / ";
    const key = [content, settings.glyphSize, settings.glyphSpacing, settings.seed].join("|");

    if (this.textTextureInfo?.key === key) {
      return;
    }

    const measureCanvas = createGlyphFlowRasterCanvas();
    const measureContext = measureCanvas.getContext("2d");
    if (!measureContext) {
      throw new Error("Glyph Flow could not create a text raster context.");
    }

    const fontSize = Math.max(6, Math.round(settings.glyphSize));
    const font = `${Math.max(500, Math.min(700, 520 + (settings.seed % 3) * 80))} ${fontSize}px ui-monospace, "SFMono-Regular", "Hiragino Sans", monospace`;
    measureContext.font = font;
    const phrase = `${content} `;
    const phraseWidth = Math.max(48, Math.ceil(measureContext.measureText(phrase).width));
    const width = Math.min(2048, phraseWidth);
    const rowSpacing = Math.max(fontSize + 1, Math.round(settings.glyphSpacing));
    const height = rowSpacing * 2;
    const textureCanvas = createGlyphFlowRasterCanvas(width, height);
    const context = textureCanvas.getContext("2d");

    if (!context) {
      throw new Error("Glyph Flow could not rasterize its text texture.");
    }

    context.clearRect(0, 0, width, height);
    context.fillStyle = "#FFFFFF";
    context.font = font;
    context.textBaseline = "top";

    const drawRepeatedRow = (y: number, offset: number) => {
      for (let x = offset - phraseWidth; x < width + phraseWidth; x += phraseWidth) {
        context.fillText(phrase, x, y);
      }
    };

    drawRepeatedRow(0, 0);
    drawRepeatedRow(rowSpacing, -(phraseWidth * ((settings.seed % 31) / 47 + 0.21)));

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textTexture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      textureCanvas,
    );

    this.textTextureInfo = { height, key, width };
  }

  private uniform1f(name: string, value: number): void {
    this.gl.uniform1f(this.getUniformLocation(name), value);
  }

  private uniform2f(name: string, x: number, y: number): void {
    this.gl.uniform2f(this.getUniformLocation(name), x, y);
  }

  private uniform3f(name: string, x: number, y: number, z: number): void {
    this.gl.uniform3f(this.getUniformLocation(name), x, y, z);
  }

  private getUniformLocation(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      this.uniformLocations.set(name, this.gl.getUniformLocation(this.program, name));
    }

    return this.uniformLocations.get(name) ?? null;
  }
}

export function renderGlyphFlowFrame(
  canvas: HTMLCanvasElement,
  settings: GlyphFlowSettings,
): void {
  const renderer = new GlyphFlowWebGlRenderer(canvas, { preserveDrawingBuffer: true });
  try {
    renderer.render(settings);
  } finally {
    renderer.dispose(true);
  }
}
