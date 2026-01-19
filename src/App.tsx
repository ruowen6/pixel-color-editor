// src/App.tsx
import { useEffect, useState, useMemo } from "react";
import "./App.css";
import type { GridSize, PixelGrid } from "./types/pixel";
import { dataUrlToPixelGrid } from "./utils/imageToGrid";
import {
  computeRelation,
  type ColorRelation,
  buildPreviewPixels,
} from "./utils/relation";
import { rgbToHex } from "./utils/color";
import { PixelCanvasPanel } from "./components/PixelCanvasPanel";
import { PreviewCanvasPanel } from "./components/PreviewCanvasPanel";

function App() {
  const [gridSize, setGridSize] = useState<GridSize>(16);
  const [grid, setGrid] = useState<PixelGrid | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState<string>("#020617");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // 选区确认后的 颜色关系数据
  const [relation, setRelation] = useState<ColorRelation | null>(null);
  // 基准像素（Step 3 会用到，先定义好），默认取选区的第一个
  const [basePixelIndex, setBasePixelIndex] = useState<number | null>(null);
  // 【新增】基准像素当前颜色（可能是被改过的）
  const [baseColorHex, setBaseColorHex] = useState<string | null>(null);

  // 上传后的图片 + 像素尺寸 => 像素网格
  useEffect(() => {
    if (!imageSrc) {
      setGrid(null);
      setIsConfirmed(false);
      setRelation(null);
      setBasePixelIndex(null);
      setBaseColorHex(null);
      return;
    }
    dataUrlToPixelGrid(imageSrc, gridSize)
      .then((newGrid) => {
        setGrid(newGrid);
        setIsConfirmed(false);
        setRelation(null);
        setBasePixelIndex(null);
        setBaseColorHex(null);
      })
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

  // 确认选区：计算颜色关系
  const handleConfirm = () => {
    if (!grid) return;
    setIsConfirmed(true);

    // 默认找第一个被选中的像素作为 base
    // 如果一个都没选，就 undefined
    const firstSelectedIndex = grid.pixels.findIndex((p) => p.selected);

    if (firstSelectedIndex !== -1) {
      setBasePixelIndex(firstSelectedIndex);
      const rel = computeRelation(grid, firstSelectedIndex);
      setRelation(rel);
      // set color
      const p = grid.pixels[firstSelectedIndex];
      setBaseColorHex(rgbToHex({ r: p.r, g: p.g, b: p.b }));
    } else {
      setBasePixelIndex(null);
      setRelation(null);
      setBaseColorHex(null);
    }
  };

  // 修改选区：重置关系
  const handleModify = () => {
    setIsConfirmed(false);
    setRelation(null);
    setBasePixelIndex(null);
    setBaseColorHex(null);
  };

  // 设置新的基准像素（右键）
  const handleSetBasePixel = (idx: number) => {
    if (!grid) return;
    setBasePixelIndex(idx);
    
    // 重新计算相对关系
    // 注意：这个时候我们要以原始颜色计算关系，所以还是取 grid 里的
    const rel = computeRelation(grid, idx);
    setRelation(rel);

    // 重置 baseColorHex 为该像素原始颜色 (或者如果要保留之前的修改意图？)
    // 简单起见，切换基准点时重置为基准点的原始色
    const p = grid.pixels[idx];
    setBaseColorHex(rgbToHex({ r: p.r, g: p.g, b: p.b }));
  };

  const handleBaseColorChange = (color: string) => {
    setBaseColorHex(color);
  };

  // 计算预览网格
  const previewGrid = useMemo(() => {
    if (!grid) return null;
    // 如果没有 relation 或 baseColorHex，就等于原始 grid
    if (!isConfirmed || !relation || !basePixelIndex || !baseColorHex) {
      return grid;
    }
    return buildPreviewPixels(grid, relation, baseColorHex);
  }, [grid, isConfirmed, relation, basePixelIndex, baseColorHex]);

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
          <PixelCanvasPanel
            grid={grid}
            setGrid={setGrid}
            bgColor={bgColor}
            isConfirmed={isConfirmed}
            onConfirm={handleConfirm}
            onModify={handleModify}
            basePixelIndex={basePixelIndex}
            baseColorHex={baseColorHex}
            onSetBasePixel={handleSetBasePixel}
            onBaseColorChange={handleBaseColorChange}
          />
          <PreviewCanvasPanel
            grid={previewGrid}
            bgColor={bgColor}
            isConfirmed={isConfirmed}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
