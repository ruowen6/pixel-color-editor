// src/App.tsx
import { useEffect, useState } from "react";
import "./App.css";
import type { GridSize, PixelGrid } from "./types/pixel";
import { dataUrlToPixelGrid } from "./utils/imageToGrid";
import { PixelCanvasPanel } from "./components/PixelCanvasPanel";
import { PreviewCanvasPanel } from "./components/PreviewCanvasPanel";

function App() {
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#020617");

  // 上传后的图片 + 像素尺寸 => 像素网格
  useEffect(() => {
    if (!imageSrc) {
      setGrid(null);
      return;
    }
    dataUrlToPixelGrid(imageSrc, gridSize)
      .then(setGrid)
      .catch((err) => console.error(err));
  }, [imageSrc, gridSize]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    input.value = "";

    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Pixel Color Relation Editor</h1>
        <p className="subtitle">
          上方：基础设置 / 下方：左为选区窗格（可选择），右为预览窗格（只读）
        </p>
      </header>

      <main className="app-main">
        {/* 顶部控制区域 */}
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

        {/* 下方：左右两个窗格并排 */}
        <div className="canvas-row">
          <PixelCanvasPanel grid={grid} setGrid={setGrid} bgColor={bgColor} />
          <PreviewCanvasPanel grid={grid} bgColor={bgColor} />
        </div>
      </main>
    </div>
  );
}

export default App;
