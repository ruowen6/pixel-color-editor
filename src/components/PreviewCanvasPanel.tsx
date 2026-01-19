// src/components/PreviewCanvasPanel.tsx
import { useEffect, useRef, useState } from "react";
import type { PixelGrid } from "../types/pixel";
import { exportGridToPng } from "../utils/exportPng";

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

          ctx.strokeStyle = "rgba(0, 255, 225, 0.85)"; // border style
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

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                // 计算 scale: 16 -> 48 (x3), 32 -> ? (比如说也是 48? 那就是 x1.5? 或者保持 x3 -> 96?)
                // 需求: "对于16*16...我希望下载时得到的图片大小是48*48" (即 x3)
                // "那么对于32*32...合适的比例放大" (若也是 x3，则是 96*96)
                // 我们可以统一用 scale=3
                const scale = 3;
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
                const scale = 3;
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
