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
  pixels: Pixel[]; // 长度 size * size
};

function App() {
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null); // 记住最后一张上传的图片

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 拖拽选择相关状态
  const [isDragging, setIsDragging] = useState(false);
  const dragSetToRef = useRef<boolean | null>(null); // 拖拽时统一设成 true 还是 false

  // ⭐ 把 imageSrc + gridSize 转成 PixelGrid
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

  // 根据 grid 把像素画到 canvas 上
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!grid) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.strokeStyle = "#888";
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const size = grid.size;
    const cell = 20; // 显示时每个像素块的大小（px）
    canvas.width = size * cell;
    canvas.height = size * cell;

    grid.pixels.forEach((p, idx) => {
      const x = idx % size;
      const y = Math.floor(idx / size);

      // 填充颜色
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a / 255})`;
      ctx.fillRect(x * cell, y * cell, cell, cell);

      // 选区高亮
      if (p.selected) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
    });

    // 网格线（可选）
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
  }, [grid]);

  // 上传文件 → 只负责读成 dataURL，具体像素化交给上面的 useEffect
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // 立刻把 input 值清空，方便之后选同一张文件还能触发 onChange
    input.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageSrc(result);
    };
    reader.readAsDataURL(file);
  };

  // 把鼠标事件的坐标转换成像素索引
  const getPixelIndexFromEvent = (
    e: React.MouseEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    currentGrid: PixelGrid
  ): number | null => {
    const rect = canvas.getBoundingClientRect();

    // 考虑 CSS 缩放情况
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const offsetX = (e.clientX - rect.left) * scaleX;
    const offsetY = (e.clientY - rect.top) * scaleY;

    const size = currentGrid.size;
    const cellW = canvas.width / size;
    const cellH = canvas.height / size;

    const x = Math.floor(offsetX / cellW);
    const y = Math.floor(offsetY / cellH);

    if (x < 0 || y < 0 || x >= size || y >= size) return null;
    return y * size + x;
  };

  // 鼠标按下：决定是「刷选中」还是「刷取消」，并立即应用到当前格子
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const idx = getPixelIndexFromEvent(e, canvas, grid);
    if (idx === null) return;

    setIsDragging(true);

    setGrid((prev) => {
      if (!prev) return prev;
      const current = prev.pixels[idx];
      const targetSelected = !current.selected; // 反转作为本次拖拽目标状态
      dragSetToRef.current = targetSelected;

      const newPixels = prev.pixels.map((p, i) =>
        i === idx ? { ...p, selected: targetSelected } : p
      );
      return { ...prev, pixels: newPixels };
    });
  };

  // 鼠标移动：如果正在拖拽，则把经过的格子统一设成 dragSetToRef.current
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !grid) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const target = dragSetToRef.current;
    if (target === null) return;

    const idx = getPixelIndexFromEvent(e, canvas, grid);
    if (idx === null) return;

    setGrid((prev) => {
      if (!prev) return prev;
      const oldPixel = prev.pixels[idx];
      if (oldPixel.selected === target) return prev; // 已经是目标状态就不用改

      const newPixels = prev.pixels.map((p, i) =>
        i === idx ? { ...p, selected: target } : p
      );
      return { ...prev, pixels: newPixels };
    });
  };

  // 鼠标松开 / 离开画布：结束拖拽
  const stopDragging = () => {
    setIsDragging(false);
    dragSetToRef.current = null;
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Pixel Color Relation Editor</h1>
        <p className="subtitle">
          上传图片 → 像素化 → 单击 / 拖拽选择像素块（接下来再做联动改色）
        </p>
      </header>

      <main className="app-main">
        <section className="controls">
          <label className="control-group">
            <span>选择像素尺寸：</span>
            <select
              value={gridSize}
              onChange={(e) =>
                setGridSize(Number(e.target.value) as GridSize)
              }
            >
              <option value={16}>16 × 16</option>
              <option value={32}>32 × 32</option>
            </select>
            <span className="hint">
              会基于当前图片，自动重算新的 {gridSize} × {gridSize}
            </span>
          </label>

          <label className="control-group">
            <span>上传图片：</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>

          {grid && (
            <p className="hint">
              当前像素网格：{grid.size} × {grid.size}，已选中{" "}
              {grid.pixels.filter((p) => p.selected).length} 个像素块
            </p>
          )}
          {!imageSrc && (
            <p className="hint">还没有图片，请先上传一张。</p>
          )}
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
            <p className="hint">
              目前还没有像素数据，请先选择尺寸并上传一张图片。
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
