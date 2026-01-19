// src/utils/relation.ts
import type { PixelGrid } from "../types/pixel";
import { rgbToHsl, shortestHueDelta, type ColorRelation, type RGB, hexToRgb, applyRelation, hslToRgb } from "./color";

export type { ColorRelation };

export function computeRelation(grid: PixelGrid, baseIndex: number): ColorRelation {
  const base = grid.pixels[baseIndex];
  const baseHsl = rgbToHsl({ r: base.r, g: base.g, b: base.b });

  const deltas = grid.pixels.map((p) => {
    if (!p.selected) return null;
    const hsl = rgbToHsl({ r: p.r, g: p.g, b: p.b });
    return {
      dh: shortestHueDelta(baseHsl.h, hsl.h),
      ds: hsl.s - baseHsl.s,
      dl: hsl.l - baseHsl.l,
    };
  });

  return { baseIndex, baseHsl, deltas };
}

export function buildPreviewPixels(
  grid: PixelGrid,
  relation: ColorRelation | null,
  baseColorHex: string | null
): PixelGrid {
  if (!relation || !baseColorHex) return grid;

  const baseNewRgb: RGB = hexToRgb(baseColorHex);
  const baseNewHsl = rgbToHsl(baseNewRgb);

  const newPixels = grid.pixels.map((p, idx) => {
    const d = relation.deltas[idx];
    if (!d) return p; // 未选中：保持原样

    const newHsl = applyRelation(baseNewHsl, d);
    const newRgb = hslToRgb(newHsl);

    return {
      ...p,
      r: newRgb.r,
      g: newRgb.g,
      b: newRgb.b,
      // alpha 保持原像素
    };
  });

  return { ...grid, pixels: newPixels };
}
