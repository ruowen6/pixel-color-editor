// src/utils/exportPng.ts
import type { PixelGrid } from "../types/pixel";
import { hexToRgb, compositeOverBg } from "./color";

export function exportGridToPng(
  grid: PixelGrid,
  opts: {
    background: "transparent" | "color";
    bgColorHex: string;
    filename?: string;
    onlySelected?: boolean; // 新增：仅导出选中部分
    scale?: number; // 新增：放大倍数
  }
) {
  const size = grid.size;
  const scale = opts.scale ?? 1;
  const outputSize = size * scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 如果启用平滑缩放，可能会模糊像素；像素画通常希望“nearest-neighbor”
  ctx.imageSmoothingEnabled = false;

  const bg = hexToRgb(opts.bgColorHex);

  // 我们先在内存里以 1x1 原始大小画好，然后再放大
  // 或者直接画矩形。直接画矩形更简单。
  
  // 如果需要背景色，先涂满
  if (opts.background === "color") {
      // 注意：如果 onlySelected 为 true，我们通常希望背景是透明的？？
      // 这里的逻辑有点歧义：如果只有Selected，那未被选中的区域是透明的还是背景色？
      // 一般来说 "导出选中区域" 意味着其余部分都是透明的。
      // 但如果用户同时选了 "背景色" 选项，也许希望把选区的背景是那颜色的。
      // 让我们这样定：整个画布先涂背景色（如果需要），然后只画选中的像素（如果是 onlySelected）。
      // 不过，如果 onlySelected，那未选中区域应该是透明的。
      // 所以如果 onlySelected=true，我们只遍历选中的像素。
      
      // 如果 !onlySelected，说明全图导出，此时背景色对全图生效。
      // 如果 onlySelected，背景色是否生效？通常我们希望导出透明背景的特定部件。
      // 但也可能希望导出带有底色的特定部件。
      
      // 简单处理：如果 background="color"，我们先填满背景色。
      // 如果是 onlySelected，且选择了背景色导出，则未选中区域也会被背景色填充。
       
      ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`;
      ctx.fillRect(0, 0, outputSize, outputSize);
  }

  for (let i = 0; i < grid.pixels.length; i++) {
    const p = grid.pixels[i];

    // 如果仅导出选中，跳过未选中的
    if (opts.onlySelected && !p.selected) {
        continue;
    }
    
    let r = p.r, g = p.g, b = p.b, a = p.a;

    // 如果启用了背景融合，且该像素半透明
    if (opts.background === "color") {
        const mixed = compositeOverBg({ r, g, b, a }, bg);
        r = mixed.r; g = mixed.g; b = mixed.b; a = 255; 
        // 注意：如果是 onlySelected 模式，我们上面没有涂全屏背景，
        // 这里的 compositeOverBg 会把像素和背景色混合，但像素本身变成不透明，
        // 而像素周围（因为是按格画）还是透明的。这符合 "带有底色的物体（抠图）" 的效果。
    }

    ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
    ctx.fillRect(
        (i % size) * scale, 
        Math.floor(i / size) * scale, 
        scale, 
        scale
    );
  }

  const url = canvas.toDataURL("image/png");
  const aEl = document.createElement("a");
  aEl.href = url;
  aEl.download = opts.filename ?? `pixel-${size}x${size}.png`;
  aEl.click();
}
