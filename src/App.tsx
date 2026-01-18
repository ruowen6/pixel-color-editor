import { useEffect, useState } from "react";
import "./App.css";
import type { GridSize, PixelGrid } from "./types/pixel";
import { dataUrlToPixelGrid } from "./utils/imageToGrid";
import { PixelCanvasPanel } from "./components/PixelCanvasPanel";

function App() {
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#020617");

  // 将上传图像 + gridSize 转成像素网格（逻辑保留，只是调用 utils）
  useEffect(() => {
    if (!imageSrc) {
      setGrid(null);
      return;
    }
    dataUrlToPixelGrid(imageSrc, gridSize).then(setGrid).catch(console.error);
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
          单击/拖拽刷选；按住 <b>Shift</b> 拖拽可矩形框选；背景色可自定义
        </p>
      </header>

      <main className="app-main">
        <section className="controls">
          <label className="control-group">
            <span>选择像素尺寸：</span>
            <select value={gridSize} onChange={(e) => setGridSize(Number(e.target.value) as GridSize)}>
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
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
            <span className="hint">对透明底图片特别有用，可以尝试白色、灰色等不同底色</span>
          </label>

          {grid && (
            <p className="hint">
              当前像素网格：{grid.size} × {grid.size}，已选中 {grid.pixels.filter((p) => p.selected).length} 个像素块
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

        <PixelCanvasPanel grid={grid} setGrid={setGrid} bgColor={bgColor} />
      </main>
    </div>
  );
}

export default App;
