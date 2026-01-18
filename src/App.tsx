import { useEffect, useRef, useState } from "react";
import "./App.css";

type GridSize = 16 | 32;

type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
  selected: boolean;
};

type PixelGrid = {
  size: GridSize;
  pixels: Pixel[];
};

type Point = { x: number; y: number };

function App() {
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // ⭐ 新增：画布背景颜色（默认接近现在的深色）
  const [bgColor, setBgColor] = useState<string>("#020617");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 拖拽状态（刷子模式 + 矩形模式公用）
  const [isDragging, setIsDragging] = useState(false);
  const dragSetToRef = useRef<boolean | null>(null); // 本次拖拽选中状态

  // 矩形框选状态（Shift + 拖动）
  const isRectModeRef = useRef(false);
  const rectStartRef = useRef<Point | null>(null);
  const rectEndRef = useRef<Point | null>(null);

  // 将上传图像 + gridSize 转成像素网格
  useEffect(() => {
    if (!imageSrc) {
      setGrid(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const size = gridSize;

      const hidden = document.createElement("canvas");
      hidden.width = size;
      hidden.height = size;
      const hctx = hidden.getContext("2d");
      if (!hctx) return;

      hctx.drawImage(img, 0, 0, size, size);
      const imageData = hctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      const pixels: Pixel[] = [];
      for (let i = 0; i < data.length; i += 4) {
        pixels.push({
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          a: data[i + 3],
          selected: false,
        });
      }

      setGrid({ size, pixels });
    };
    img.src = imageSrc;
  }, [imageSrc, gridSize]);

  // 根据 grid + bgColor 绘制像素画，并在矩形框选时画 overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!grid) {
      canvas.width = 320;
      canvas.height = 320;

      // ⭐ 先画背景色
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

    // ⭐ 底层：整块画布先铺背景颜色（透明像素就会透出这个颜色）
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画像素块 + 选中 cover
    grid.pixels.forEach((p, idx) => {
      const x = idx % size;
      const y = Math.floor(idx / size);

      const px = x * cell;
      const py = y * cell;

      // 底层：原始像素颜色（包含透明度）
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
      ctx.fillRect(px, py, cell, cell);

      if (p.selected) {
        // 半透明 cover（这里用黄色，你可以换成绿色）
        ctx.save();
        // 绿色：rgba(34, 197, 94, 0.45)
        // 黄色：rgba(250, 204, 21, 0.45)
        // blue: rgba(21, 212, 250, 0.25)
        ctx.fillStyle = "rgba(21, 212, 250, 0.25)";
        ctx.fillRect(px, py, cell, cell);
        ctx.restore();

        // 外圈高亮边框
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

  // 上传文件：读成 dataURL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    input.value = ""; // 允许选择同一文件再次触发 onChange

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  // 坐标转换：事件点 -> 像素格坐标 (x,y)
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

  // 应用矩形选区：把矩形内所有格子设成 targetSelected
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

  // 鼠标按下：Shift => 矩形框选；否则刷子拖拽
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
      // 矩形框选模式
      isRectModeRef.current = true;
      rectStartRef.current = cell;
      rectEndRef.current = cell;
      // 触发重绘 overlay
      setGrid((prev) => (prev ? { ...prev } : prev));
    } else {
      // 刷子模式：立刻应用到按下的格子
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

  // 鼠标移动：矩形模式更新 end；刷子模式沿途涂抹
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cell = getCellFromEvent(e, canvas, grid);
    if (!cell) return;

    const target = dragSetToRef.current;
    if (target === null) return;

    if (isRectModeRef.current) {
      // 更新矩形终点并刷新 overlay
      rectEndRef.current = cell;
      setGrid((prev) => (prev ? { ...prev } : prev));
      return;
    }

    // 刷子模式：经过的格子统一设为 target
    const idx = cellToIndex(cell, grid.size);
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

  // 松开：如果是矩形模式，则应用矩形选区；然后清理 overlay
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

    // 清掉 overlay（触发一次重绘）
    setGrid((prev) => (prev ? { ...prev } : prev));
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Pixel Color Relation Editor</h1>
        <p className="subtitle">
          单击/拖拽刷选；按住 <b>Shift</b> 拖拽可矩形框选；背景色可自定义
        </p>
      </header>

      <main className="app-main">
        <section className="controls">
          <label className="control-group">
            <span>选择像素尺寸：</span>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value) as GridSize)}
            >
              <option value={16}>16 × 16</option>
              <option value={32}>32 × 32</option>
            </select>
            <span className="hint">会基于当前图片自动重算像素网格</span>
          </label>

          <label className="control-group">
            <span>上传图片：</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>

          <label className="control-group">
            <span>画布背景颜色：</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
            <span className="hint">
              对透明底图片特别有用，可以尝试白色、灰色等不同底色
            </span>
          </label>

          {grid && (
            <p className="hint">
              当前像素网格：{grid.size} × {grid.size}，已选中{" "}
              {grid.pixels.filter((p) => p.selected).length} 个像素块
            </p>
          )}

          <div className="hint" style={{ marginTop: 10, lineHeight: 1.6 }}>
            <div>操作提示：</div>
            <div>• 单击：选中/取消单个格子</div>
            <div>• 拖动：刷选一片（或刷取消一片）</div>
            <div>• Shift + 拖动：矩形框选（松开后生效）</div>
            <div>• 背景颜色：改变透明区域的“底色”效果</div>
          </div>
        </section>

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
          {!grid && (
            <p className="hint">目前还没有像素数据，请先上传一张图片。</p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
