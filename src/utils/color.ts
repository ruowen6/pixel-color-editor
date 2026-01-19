// src/utils/color.ts
export type RGB = { r: number; g: number; b: number };
export type HSL = { h: number; s: number; l: number }; // h:0..360, s/l:0..1

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const clamp255 = (x: number) => Math.max(0, Math.min(255, Math.round(x)));

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to2 = (v: number) => clamp255(v).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d !== 0) {
    switch (max) {
      case rr: h = ((gg - bb) / d) % 6; break;
      case gg: h = (bb - rr) / d + 2; break;
      case bb: h = (rr - gg) / d + 4; break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360 + 360) % 360;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;

  let rr = 0, gg = 0, bb = 0;
  if (hh < 60) { rr = c; gg = x; bb = 0; }
  else if (hh < 120) { rr = x; gg = c; bb = 0; }
  else if (hh < 180) { rr = 0; gg = c; bb = x; }
  else if (hh < 240) { rr = 0; gg = x; bb = c; }
  else if (hh < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }

  return {
    r: clamp255((rr + m) * 255),
    g: clamp255((gg + m) * 255),
    b: clamp255((bb + m) * 255),
  };
}

// hue 差用“最短路径”（例如 350 -> 10 是 +20 而不是 -340）
export function shortestHueDelta(fromH: number, toH: number): number {
  let d = toH - fromH;
  d = ((d + 540) % 360) - 180; // -> [-180,180)
  return d;
}

export type ColorRelation = {
  baseIndex: number;
  baseHsl: HSL;
  // 只有 selected 的 idx 才有 delta；没选的为 null
  deltas: Array<{ dh: number; ds: number; dl: number } | null>;
};

export function compositeOverBg(fg: { r: number; g: number; b: number; a: number }, bg: RGB): RGB {
  const alpha = fg.a / 255;
  const r = fg.r * alpha + bg.r * (1 - alpha);
  const g = fg.g * alpha + bg.g * (1 - alpha);
  const b = fg.b * alpha + bg.b * (1 - alpha);
  return { r: clamp255(r), g: clamp255(g), b: clamp255(b) };
}

const mod360 = (h: number) => ((h % 360) + 360) % 360;

export function applyRelation(baseNew: HSL, delta: { dh: number; ds: number; dl: number }): HSL {
  return {
    h: mod360(baseNew.h + delta.dh),
    s: clamp01(baseNew.s + delta.ds),
    l: clamp01(baseNew.l + delta.dl),
  };
}
