// src/components/PixelCanvasPanel.tsx
import { useEffect, useRef, useState } from "react";
import type { PixelGrid, Point } from "../types/pixel";

type Props = {
  grid: PixelGrid | null;
  setGrid: React.Dispatch<React.SetStateAction<PixelGrid | null>>;
  bgColor: string;
  isConfirmed: boolean;
  onConfirm: () => void;
  onModify: () => void;
  basePixelIndex: number | null;
  baseColorHex: string | null;
  onSetBasePixel: (idx: number) => void;
  onBaseColorChange: (color: string) => void;
  keepLightness: boolean;
  onToggleKeepLightness: () => void;
  t: any;
};

export function PixelCanvasPanel({
  grid,
  setGrid,
  bgColor,
  isConfirmed,
  onConfirm,
  onModify,
  basePixelIndex,
  baseColorHex,
  onSetBasePixel,
  onBaseColorChange,
  keepLightness,
  onToggleKeepLightness,
  t,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragSetToRef = useRef<boolean | null>(null);

  const isRectModeRef = useRef(false);
  const rectStartRef = useRef<Point | null>(null);
  const rectEndRef = useRef<Point | null>(null);

  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 监听 Shift 按下/松开，用来切换 cursor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 绘制
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

      // ⭐ 判断是否是当前 hover 的像素
      const isHovered = hoverIndex === idx;
      const inflate = isHovered ? 2 : 0; // 放大 2px，可自行调
      const drawX = px - inflate;
      const drawY = py - inflate;
      const drawSize = cell + inflate * 2;

      // 用放大后的尺寸来画
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
      ctx.fillRect(drawX, drawY, drawSize, drawSize);

      // ⭐ hover 描边（淡白色，只在 hover 且未选中时）
      if (isHovered && !p.selected && !isConfirmed) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)"; // 半透明白
        ctx.lineWidth = 1.5;
        ctx.strokeRect(drawX + 0.75, drawY + 0.75, drawSize - 1.5, drawSize - 1.5);
        ctx.restore();
      }

      if (p.selected) {
        // If confirmed, fillStyle disappears, strokeStyle remains
        if (!isConfirmed) {
          ctx.save();
          ctx.fillStyle = "rgba(21, 212, 250, 0.25)";
          ctx.fillRect(drawX, drawY, drawSize, drawSize);
          ctx.restore();
        }

        // Special border for Base Pixel
        const isBase = idx === basePixelIndex;

        ctx.strokeStyle = isBase ? "#FF0000" : "white"; // Red for base, white for others
        ctx.lineWidth = isBase ? 3 : 2;
        ctx.strokeRect(drawX + 1, drawY + 1, drawSize - 2, drawSize - 2);

        // 如果是 Base Pixel，额外画个小标记（例如左上角小红点）
        if (isBase) {
          ctx.save();
          ctx.fillStyle = "#FF0000";
          ctx.fillRect(drawX, drawY, 6, 6);
          ctx.restore();
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

    const start = rectStartRef.current;
    const end = rectEndRef.current;
    if (start && end && !isConfirmed) {
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
  }, [grid, bgColor, hoverIndex, isConfirmed, basePixelIndex]);

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
    if (!grid || isConfirmed) return;
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
        const newPixels = prev.pixels.map((p, i) =>
          i === idx ? { ...p, selected: targetSelected } : p
        );
        return { ...prev, pixels: newPixels };
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cell = getCellFromEvent(e, canvas, grid);
    if (!cell) {
      setHoverIndex(null);
      return;
    }

    const idx = cellToIndex(cell, grid.size);
    // ⭐ 始终更新 hoverIndex（无论是否在拖拽）
    setHoverIndex(idx);

    // 如果没在拖拽，后面不改选区
    if (!isDragging) return;

    const target = dragSetToRef.current;
    if (target === null) return;

    if (isRectModeRef.current) {
      rectEndRef.current = cell;
      setGrid((prev) => (prev ? { ...prev } : prev));
      return;
    }

    setGrid((prev) => {
      if (!prev) return prev;
      const oldPixel = prev.pixels[idx];
      if (oldPixel.selected === target) return prev;

      const newPixels = prev.pixels.map((p, i) =>
        i === idx ? { ...p, selected: target } : p
      );
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

  const handleMouseLeave = () => {
    setHoverIndex(null);
    stopDragging();
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!grid || !isConfirmed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const cell = getCellFromEvent(e, canvas, grid);
    if (!cell) return;

    const idx = cellToIndex(cell, grid.size);
    const pixel = grid.pixels[idx];

    // 只有已选中的像素才能设为基准
    if (pixel.selected) {
      onSetBasePixel(idx);
    }
  };

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
        <h2 style={{ margin: 0 }}>{t.selectionPane}</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onConfirm} disabled={!grid || isConfirmed}>
            {t.confirmSelection}
          </button>
          <button onClick={onModify} disabled={!grid || !isConfirmed}>
            {t.modifySelection}
          </button>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="pixel-canvas"
        style={{
          cursor: isConfirmed
            ? "default"
            : isShiftPressed
            ? "crosshair"
            : "pointer",
        }} // ⭐ Shift 控制光标样式
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
      {!grid && <p className="hint">{t.noDataPixel}</p>}

      {/* 工具栏：只在 Confirmed 且有 curBase 时显示，放在 canvas 下方 */}
      {isConfirmed && basePixelIndex !== null && baseColorHex && (
        <div
          style={{
            margin: "15px auto 0",
            // 让工具栏宽度对齐 canvas
            width: canvasRef.current ? canvasRef.current.width : "auto",
            maxWidth: "100%",
            boxSizing: "border-box", // 包含 padding
            padding: "12px",
            background: "#1e293b",
            borderTop: "1px solid #334155",
            borderRadius: "4px",
            fontSize: "0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 500 }}>{t.currentBaseColor}</span>
              <input
                type="color"
                value={baseColorHex}
                onChange={(e) => onBaseColorChange(e.target.value)}
                style={{
                  cursor: "pointer",
                  width: 40,
                  height: 28,
                  border: "none",
                  padding: 0,
                }}
                title="Select Color"
              />
              <code style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                {baseColorHex}
              </code>
            </div>

            {/* Random Button */}
            <button
              onClick={() => {
                // 随机生成一个全随机 RGB HEX，交给 App 处理。
                const randomHex =
                  "#" +
                  Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, "0");
                onBaseColorChange(randomHex);
              }}
              title={t.randomColor}
              style={{
                background: "transparent",
                border: "1px solid #475569",
                borderRadius: "4px",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "1.2rem",
                lineHeight: 1,
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
              }}
            >
              🎲
            </button>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={keepLightness}
              onChange={onToggleKeepLightness}
              style={{ accentColor: "#3b82f6" }}
            />
            {t.keepLightness}
          </label>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: "22px", marginTop: "-4px" }}>
            {t.keepLightnessHint}
          </div>

          <div
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              borderTop: "1px solid #334155",
              paddingTop: "6px",
            }}
          >
            {t.hintForBaseSwitch}
          </div>
        </div>
      )}
    </section>
  );
}
