// What the shader-lit marks share (TrinityMark, LitRose): a mark's signed
// distance field from its SVG's alpha, and a WebGL2 loop that draws a
// fragment shader over it. Materials adapted from Shaders.com by Shader
// Effects Inc., MIT License, https://github.com/shader-effects-inc/shaders
// (credited in docs/ART.md). A mark holds still when motion is reduced and
// stops drawing while off screen.

import { useEffect, type RefObject } from "react";

export const SDF_VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/** "#rrggbb" (or #rgb, with optional alpha) as 0..1 RGBA. */
export const toRgba = (value: string): [number, number, number, number] => {
  const hex = value.replace("#", "");
  const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
  const ch = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
  return [ch(0), ch(2), ch(4), full.length >= 8 ? ch(6) : 1];
};

/** One row of the exact squared Euclidean distance transform (Felzenszwalb and Huttenlocher). */
function solve(grid: Float64Array, offset: number, stride: number, length: number, f: Float64Array, v: Int32Array, z: Float64Array) {
  for (let i = 0; i < length; i++) f[i] = grid[offset + i * stride];
  let k = 0;
  v[0] = 0;
  z[0] = -1e20;
  z[1] = 1e20;
  for (let q = 1; q < length; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = 1e20;
  }
  k = 0;
  for (let q = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    grid[offset + q * stride] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

function distances(grid: Float64Array, width: number, height: number) {
  const size = Math.max(width, height);
  const f = new Float64Array(size), v = new Int32Array(size), z = new Float64Array(size + 1);
  for (let x = 0; x < width; x++) solve(grid, x, width, height, f, v, z);
  for (let y = 0; y < height; y++) solve(grid, y * width, 1, width, f, v, z);
}

export type Field = { data: Float32Array; width: number; height: number };
const fields = new Map<string, Promise<Field>>();

/** The mark's signed distance field from its alpha, computed once per source. */
export function loadField(src: string): Promise<Field> {
  let p = fields.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const long = 640;
        const ratio = image.width / image.height || 1;
        const width = Math.round(ratio >= 1 ? long : long * ratio);
        const height = Math.round(ratio >= 1 ? long / ratio : long);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        const outer = new Float64Array(width * height);
        const inner = new Float64Array(width * height);
        for (let i = 0; i < width * height; i++) {
          const a = pixels[i * 4 + 3] / 255;
          const edge = 0.5 - a;
          outer[i] = a >= 1 ? 0 : a <= 0 ? 1e20 : edge > 0 ? edge * edge : 0;
          inner[i] = a <= 0 ? 0 : a >= 1 ? 1e20 : edge < 0 ? edge * edge : 0;
        }
        distances(outer, width, height);
        distances(inner, width, height);
        const unit = Math.min(width, height) / 2;
        const data = new Float32Array(width * height);
        for (let i = 0; i < data.length; i++) data[i] = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / unit;
        resolve({ data, width, height });
      };
      image.onerror = () => {
        fields.delete(src);
        reject(new Error(`could not load ${src}`));
      };
      image.src = src;
    });
    fields.set(src, p);
  }
  return p;
}

/**
 * Draw `fragment` over the field of `src` into the canvas, every frame while
 * it is on screen (one frame when motion is reduced, at `stillTime`). The
 * shader gets uField, uFieldScale, uResolution and uTime; `uniforms` sets the
 * rest each frame from current props (read them through a ref).
 */
export function useSdfShader(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  src: string,
  fragment: string,
  uniforms: (gl: WebGL2RenderingContext, at: (name: string) => WebGLUniformLocation | null) => void,
  { reduced, stillTime, deps }: { reduced: boolean; stillTime: number; deps: unknown[] },
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, SDF_VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const at = (name: string) => gl.getUniformLocation(program, name);
    const texture = gl.createTexture();
    let field: Field | null = null;
    let frame = 0;
    let alive = true;
    let visible = true;
    const started = performance.now();

    const draw = (now: number) => {
      if (!field) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const unit = Math.min(field.width, field.height) / 2;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(at("uResolution"), width, height);
      gl.uniform2f(at("uFieldScale"), unit / field.width, unit / field.height);
      gl.uniform1f(at("uTime"), reduced ? stillTime : (now - started) / 1000);
      gl.uniform1i(at("uField"), 0);
      uniforms(gl, at);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const loop = (now: number) => {
      frame = 0;
      if (!alive || !visible) return;
      draw(now);
      if (!reduced) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!frame) frame = requestAnimationFrame(loop);
    };
    // Sleep while off screen: a mark costs a frame every frame.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
    });
    io.observe(canvas);

    loadField(src)
      .then((result) => {
        if (!alive) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, result.width, result.height, 0, gl.RED, gl.FLOAT, result.data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        field = result;
        start();
      })
      .catch(() => {});

    return () => {
      alive = false;
      io.disconnect();
      cancelAnimationFrame(frame);
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, fragment, reduced, ...deps]);
}
