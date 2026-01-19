// src/components/PreviewCanvasPanel.tsx
import { useEffect, useRef } from "react";
import type { PixelGrid } from "../types/pixel";

type Props = {
  grid: PixelGrid | null;
  bgColor: string;
  isConfirmed: boolean;
};

export function PreviewCanvasPanel({ grid, bgColor, isConfirmed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      <h2>预览窗格</h2>
      <canvas
        ref={canvasRef}
        className="pixel-canvas pixel-canvas-preview"
        style={{
          cursor: "default",
          pointerEvents: "none", // 完全禁止鼠标交互（防止误触）
        }}
      />
      {!grid && <p className="hint">目前还没有像素数据，请先在上方上传图片。</p>}
    </section>
  );
}
