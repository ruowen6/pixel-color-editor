// src/utils/exportPng.ts
import type { PixelGrid } from "../types/pixel";
import { hexToRgb, compositeOverBg } from "./color";

export function exportGridToPng(
  grid: PixelGrid,
  opts: { background: "transparent" | "color"; bgColorHex: string; filename?: string }
) {
  const size = grid.size;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = ctx.createImageData(size, size);
  const data = img.data;

  const bg = hexToRgb(opts.bgColorHex);

  for (let i = 0; i < grid.pixels.length; i++) {
    const p = grid.pixels[i];
    let r = p.r, g = p.g, b = p.b, a = p.a;

    if (opts.background === "color") {
      const mixed = compositeOverBg({ r, g, b, a }, bg);
      r = mixed.r; g = mixed.g; b = mixed.b; a = 255;
    }

    const di = i * 4;
    data[di] = r;
    data[di + 1] = g;
    data[di + 2] = b;
    data[di + 3] = opts.background === "transparent" ? a : 255;
  }

  ctx.putImageData(img, 0, 0);

  const url = canvas.toDataURL("image/png");
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = opts.filename ?? `pixel-${size}x${size}.png`;
  aEl.click();
}
