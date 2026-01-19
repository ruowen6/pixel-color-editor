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
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from "./utils/color";
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
  
  // 新增：保持基准色明度选项，默认勾选
  const [keepLightness, setKeepLightness] = useState(true);

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

  const handleBaseColorChange = (newColor: string) => {
    if (!keepLightness || !basePixelIndex || !grid) {
      // 没有任何限制，或者没有基准点时，直接应用颜色
      setBaseColorHex(newColor);
      return;
    }

    // ⭐ 约束逻辑：保留原始像素的明度 L (和饱和度? 需求只强调了明度，但通常 Hue 改变时 S 最好也根据新颜色来，
    // 不过需求说 "只能移动色相条儿"，这意味着 S 和 L 都应该被锁定？
    // 让我们再看一遍需求："在进行颜色选区的时候，改变颜色的种类比如红色黄色绿色，这种改变叫色相的改变。明度...选取直接被限制住，无法移动，只能移动色相条儿。"
    // 这通常意味着我们要保留原始的明度（L），可能也要保留饱和度（S）以维持“质感”，只变 H。
    // 如果只保留 L，那么 S 会随用户选的改变。
    // 通常 "Hue Shift" 意味着只变 H。为了保险，我们暂时只锁定 L，或者同时锁定 S 和 L。
    // 既然已有的 "random" 逻辑里我们只生成 H，我们这里也尽量只取 H。
    
    // 获取当当前基准点 *原始* 的颜色信息（因为我们是基于原始关系计算的）
    // 不过等等，用户的基准点可能已经被改过颜色了？
    // 不，relation 是基于 *原始 grid* 计算的。
    // 我们的 baseColorHex 是基准点 *现在* 的颜色。
    // 约束应该是：新颜色的 L 必须等于 *原始* 颜色的 L（或当前已锁定的 L）。
    
    // 让我们始终锚定 *原始像素* 的 L。
    const originalPixel = grid.pixels[basePixelIndex];
    const originalHsl = rgbToHsl({ r: originalPixel.r, g: originalPixel.g, b: originalPixel.b });

    // 计算用户新选颜色的 H
    const newRgb = hexToRgb(newColor);
    const newHsl = rgbToHsl(newRgb);

    // 组合：新 H + 原 S + 原 L (完全锁定只准变色相)
    // 或者：新 H + 新 S + 原 L (只锁定明度) -> 需求说 "明度...被限制住"，可能 S 是可以变的。
    // 但是"随机功能也只能改变色相"暗示了 S 也可能要维持？
    // 让我们先采取 "只锁定 L" 的策略，这是最符合字面意思的。
    // 更新：为了更好的体验，通常 Hue 调整是保留 S 和 L 的。这里我们保留原图的 S 和 L，只采纳新颜色的 H。
    // 这样用户在色板上乱点，也只会改变色相。
    
    const combinedHsl = {
      h: newHsl.h,
      s: originalHsl.s, // 既然说 "只能移动色相条"，那我们把 S 也锁了吧，防止乱
      l: originalHsl.l,
    };

    const combinedRgb = hslToRgb(combinedHsl);
    setBaseColorHex(rgbToHex(combinedRgb));
  };
    
  const handleToggleKeepLightness = () => {
    setKeepLightness((prev) => {
      const nextMode = !prev;
      // 当切换回 "Keep Lightness" 时，也许应该立刻把当前的颜色校正回原始明度？
      // 这是一个很好的 UX 细节。
      if (nextMode && basePixelIndex !== null && grid && baseColorHex) {
         const originalPixel = grid.pixels[basePixelIndex];
         const originalHsl = rgbToHsl({ r: originalPixel.r, g: originalPixel.g, b: originalPixel.b });
         const currentRgb = hexToRgb(baseColorHex);
         const currentHsl = rgbToHsl(currentRgb);
         
         // 强制归位到原始 S/L
         const fixedHsl = {
             h: currentHsl.h,
             s: originalHsl.s,
             l: originalHsl.l
         };
         setBaseColorHex(rgbToHex(hslToRgb(fixedHsl)));
      }
      return nextMode;
    });
  }

  // 3.1: 保存当前修改
  const handleApplyChanges = () => {
    if (!previewGrid) return;
    
    // 1. 将当前的预览网格（改色后）变成真正的 grid
    // 注意：我们要把 selected 状态清空吗？需求说“后续再次被修改，仍以当下的修改结果为起点”
    // 通常意味着这一次改色完成了。为了避免混淆，最好是应用修改后，退出“已确认”状态，
    // 或者保持“已确认”状态但重置 relation？
    
    // 如果我们只更新 grid，relation 依然指向旧的 basePixelIndex（还是同一个格子），
    // 它的 baseColorHex 已经被我们改成新的了。
    // 但是 relation.deltas 记录的是和 *旧的* baseHsl 的差值。
    // 这里逻辑会有点绕。最稳健的做法是：
    // -> 更新 grid 为 previewGrid (新的颜色已固化)
    // -> 重置 relation 和 basePixelIndex (相当于这是一个新的起点)
    // -> 用户需要重新选区（或者保留选区？），重新点 Confirmed，重新选基准点。
    
    // 需求中说：“如果后续再次被修改，仍以当下的修改结果为起点被进行后续的调整。”
    // 这听起来像是把颜色“烤”进画布里。
    
    // 让我们先把颜色固化进 grid：
    // *注意*：previewGrid 里的 pixels 是带着 selected 状态的。
    // 如果想要用户可以继续无缝调整，我们可能需要保留选区状态。
    
    setGrid(previewGrid);
    
    // 重置“改色状态”
    setIsConfirmed(false); // 退出确认模式，允许用户重新调整选区，或者直接再次点击确认
    setRelation(null);
    setBasePixelIndex(null);
    setBaseColorHex(null);
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
            keepLightness={keepLightness}
            onToggleKeepLightness={handleToggleKeepLightness}
          />
          <PreviewCanvasPanel
            grid={previewGrid}
            bgColor={bgColor}
            isConfirmed={isConfirmed}
            onApplyChanges={handleApplyChanges}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
