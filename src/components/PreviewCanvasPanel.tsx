// src/components/PreviewCanvasPanel.tsx
import { useEffect, useRef, useState } from "react";
import type { PixelGrid } from "../types/pixel";
import { exportGridToPng } from "../utils/exportPng";
import { rgbToHsl, hslToRgb } from "../utils/color";

type Props = {
  grid: PixelGrid | null;
  bgColor: string; // The canvas bg color (user selected)
  isConfirmed: boolean;
  onApplyChanges: () => void;
  t: any;
};

export function PreviewCanvasPanel({
  grid,
  bgColor,
  isConfirmed,
  onApplyChanges,
  t,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 默认开启“仅导出选中”如果当前处于选择模式？或者总是提供全选？
  // 为简单起见，我们提供4个按钮或者一个checkbox?
  // 加上 "Scale" 选项。
  const [onlySelected, setOnlySelected] = useState(false);
  const [exportSize, setExportSize] = useState(48);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!grid) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#888";
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const size = grid.size;
    const cell = 20;
    canvas.width = size * cell;
    canvas.height = size * cell;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
// 计算选区综合色相的对比色
    let selectionBorderColor = "rgba(0, 255, 225, 0.85)";
    let sR = 0, sG = 0, sB = 0, sCount = 0;
    for (const p of grid.pixels) {
      if (p.selected) {
        sR += p.r;
        sG += p.g;
        sB += p.b;
        sCount++;
      }
    }
    if (sCount > 0) {
      const avg = { r: sR / sCount, g: sG / sCount, b: sB / sCount };
      const hsl = rgbToHsl(avg);
      // 色相旋转 180 度（补色）
      const newH = (hsl.h + 180) % 360;
      // 使用该色相下最鲜艳的颜色：饱和度 100%，亮度 50%
      const rgb = hslToRgb({ h: newH, s: 1.0, l: 0.5 });
      selectionBorderColor = `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.85)`;
    }

    grid.pixels.forEach((p, idx) => {
      const x = idx % size;
      const y = Math.floor(idx / size);
      const px = x * cell;
      const py = y * cell;

      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
      ctx.fillRect(px, py, cell, cell);

      if (p.selected) {
        // Only show selection border if NOT confirmed
        if (!isConfirmed) {
          ctx.save();
          // ctx.fillStyle = ""; // remove useless fill
          // ctx.fillRect(px, py, cell, cell);
          ctx.restore();

          ctx.strokeStyle = selectionBorderColor; // Use calculated color
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      }
    });

    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }
  }, [grid, bgColor, isConfirmed]);

  return (
    <section className="canvas-panel">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <h2 style={{ margin: 0 }}>{t.previewPane}</h2>
        {isConfirmed && grid && (
          <button onClick={onApplyChanges} title="把当前的改色结果固化到网格中">
            {t.saveChanges}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="pixel-canvas pixel-canvas-preview"
        style={{
          cursor: "default",
          pointerEvents: "none", // 完全禁止鼠标交互（防止误触）
        }}
      />
      {!grid && <p className="hint">{t.noDataPixel}</p>}

      {grid && (
        <div
          className="export-panel"
          style={{
            marginTop: "15px",
            padding: "12px",
            borderTop: "1px solid #334155",
          }}
        >
          <div style={{ marginBottom: "8px", fontWeight: 500 }}>{t.exportOptions}</div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.9rem",
              marginBottom: "10px",
              cursor: "pointer",
              color: "#e2e8f0",
            }}
          >
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => setOnlySelected(e.target.checked)}
              style={{ accentColor: "#3b82f6" }}
            />
            {t.onlySelected}
          </label>

          <div style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "#e2e8f0", marginRight: "8px" }}>{t.exportSizeOptions}</span>
            <select
                value={exportSize}
                onChange={(e) => setExportSize(Number(e.target.value))}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#1e293b",
                  color: "white",
                  border: "1px solid #475569",
                  fontSize: "0.9rem"
                }}
            >
                {[16, 32, 48, 64, 128, 144, 256, 512].map((size) => (
                  <option key={size} value={size}>
                    {size} x {size}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                const scale = exportSize / grid.size;
                exportGridToPng(grid, {
                  background: "transparent",
                  bgColorHex: bgColor,
                  onlySelected,
                  scale,
                  filename: `pixel-${grid.size}x${grid.size}${
                    onlySelected ? "-selected" : ""
                  }.png`,
                });
              }}
              title="保留透明通道，只有像素点有颜色"
            >
              {t.exportTransparent}
            </button>
            <button
              onClick={() => {
                const scale = exportSize / grid.size;
                exportGridToPng(grid, {
                  background: "color",
                  bgColorHex: bgColor,
                  onlySelected,
                  scale,
                  filename: `pixel-${grid.size}x${grid.size}${
                    onlySelected ? "-selected" : ""
                  }-bg.png`,
                });
              }}
              title={`将目前的背景色 (${bgColor}) 融合进图片`}
            >
              {t.exportWithBg}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
