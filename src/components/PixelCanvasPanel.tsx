import { useEffect, useRef, useState } from "react";
import type { PixelGrid, Point } from "../types/pixel";

type Props = {
  grid: PixelGrid | null;
  setGrid: React.Dispatch<React.SetStateAction<PixelGrid | null>>;
  bgColor: string;
};

export function PixelCanvasPanel({ grid, setGrid, bgColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 拖拽状态（刷子模式 + 矩形模式公用）
  const [isDragging, setIsDragging] = useState(false);
  const dragSetToRef = useRef<boolean | null>(null);

  // 矩形框选状态（Shift + 拖动）
  const isRectModeRef = useRef(false);
  const rectStartRef = useRef<Point | null>(null);
  const rectEndRef = useRef<Point | null>(null);

  // ✅ 绘制逻辑：从 App 原样搬来
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

    // 画像素块 + 选中 cover
    grid.pixels.forEach((p, idx) => {
      const x = idx % size;
      const y = Math.floor(idx / size);

      const px = x * cell;
      const py = y * cell;

      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
      ctx.fillRect(px, py, cell, cell);

      if (p.selected) {
        ctx.save();
        ctx.fillStyle = "rgba(21, 212, 250, 0.25)"; // 你现在用的蓝色 cover
        ctx.fillRect(px, py, cell, cell);
        ctx.restore();

        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    });

    // 网格线
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

    // 矩形框选 overlay
    const start = rectStartRef.current;
    const end = rectEndRef.current;
    if (start && end) {
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);

      const x = minX * cell;
      const y = minY * cell;
      const w = (maxX - minX + 1) * cell;
      const h = (maxY - minY + 1) * cell;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.restore();
    }
  }, [grid, bgColor]);

  // ✅ 工具函数：从 App 原样搬来
  const getCellFromEvent = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    currentGrid: PixelGrid
  ): Point | null => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const size = currentGrid.size;
    const cellW = canvas.width / size;
    const cellH = canvas.height / size;

    const x = Math.floor(px / cellW);
    const y = Math.floor(py / cellH);

    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return { x, y };
  };

  const cellToIndex = (p: Point, size: number) => p.y * size + p.x;

  const applyRectSelection = (start: Point, end: Point, targetSelected: boolean) => {
    if (!grid) return;

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    setGrid((prev) => {
      if (!prev) return prev;
      const size = prev.size;
      const newPixels = prev.pixels.map((p, idx) => {
        const x = idx % size;
        const y = Math.floor(idx / size);
        const inRect = x >= minX && x <= maxX && y >= minY && y <= maxY;
        return inRect ? { ...p, selected: targetSelected } : p;
      });
      return { ...prev, pixels: newPixels };
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cell = getCellFromEvent(e, canvas, grid);
    if (!cell) return;

    setIsDragging(true);

    const idx = cellToIndex(cell, grid.size);
    const currentSelected = grid.pixels[idx].selected;
    const targetSelected = !currentSelected;
    dragSetToRef.current = targetSelected;

    if (e.shiftKey) {
      isRectModeRef.current = true;
      rectStartRef.current = cell;
      rectEndRef.current = cell;
      setGrid((prev) => (prev ? { ...prev } : prev));
    } else {
      isRectModeRef.current = false;
      rectStartRef.current = null;
      rectEndRef.current = null;

      setGrid((prev) => {
        if (!prev) return prev;
        const newPixels = prev.pixels.map((p, i) => (i === idx ? { ...p, selected: targetSelected } : p));
        return { ...prev, pixels: newPixels };
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cell = getCellFromEvent(e, canvas, grid);
    if (!cell) return;

    const target = dragSetToRef.current;
    if (target === null) return;

    if (isRectModeRef.current) {
      rectEndRef.current = cell;
      setGrid((prev) => (prev ? { ...prev } : prev));
      return;
    }

    const idx = cellToIndex(cell, grid.size);
    setGrid((prev) => {
      if (!prev) return prev;
      const oldPixel = prev.pixels[idx];
      if (oldPixel.selected === target) return prev;

      const newPixels = prev.pixels.map((p, i) => (i === idx ? { ...p, selected: target } : p));
      return { ...prev, pixels: newPixels };
    });
  };

  const stopDragging = () => {
    if (isRectModeRef.current && rectStartRef.current && rectEndRef.current) {
      const target = dragSetToRef.current ?? true;
      applyRectSelection(rectStartRef.current, rectEndRef.current, target);
    }

    setIsDragging(false);
    dragSetToRef.current = null;
    isRectModeRef.current = false;
    rectStartRef.current = null;
    rectEndRef.current = null;

    setGrid((prev) => (prev ? { ...prev } : prev));
  };

  return (
    <section className="canvas-panel">
      <h2>像素预览 & 选区</h2>
      <canvas
        ref={canvasRef}
        className="pixel-canvas"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      />
      {!grid && <p className="hint">目前还没有像素数据，请先上传一张图片。</p>}
    </section>
  );
}
