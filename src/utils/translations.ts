export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    title: "Pixel Color Relation Editor",
    subtitle: "上方：基础设置 / 下方：左为选区窗格（可选择），右为预览窗格（只读）",
    
    // Controls
    selectPixelSize: "选择像素尺寸：",
    pixelSizeHint: "会基于当前图片自动重算像素网格",
    uploadImage: "上传图片：",
    canvasBgColor: "画布背景颜色：",
    canvasBgHint: "对透明底图片特别有用，可以尝试白色、灰色等不同底色",
    
    // Grid Info
    currentGrid: "当前像素网格：",
    selectedPixels: " 个像素块",
    selectedPrefix: "，已选中 ",
    
    // Manual
    manualTitle: "操作提示：",
    manualClick: "• 单击：选中/取消单个格子",
    manualDrag: "• 拖动：刷选一片（或刷取消一片）",
    manualShiftDrag: "• Shift + 拖动：矩形框选（松开后生效）",
    manualBg: "• 背景颜色：改变透明区域的“底色”效果",
    
    // Pixel Canvas Panel
    selectionPane: "选区窗格",
    confirmSelection: "确认选区",
    modifySelection: "修改选区",
    noDataPixel: "目前还没有像素数据，请先上传一张图片。",
    currentBaseColor: "当前基准色:",
    keepLightness: "保持基准色明度",
    keepLightnessHint: "(勾选后仅能修改色相，明度光谱修改功能已禁用)",
    hintForBaseSwitch: "提示：右键点击选中区域的其她格子，可切换基准点。",
    randomColor: "随机颜色",
    
    // Preview Canvas Panel
    previewPane: "预览窗格",
    saveChanges: "保存当前修改",
    saveChangesTitle: "把当前的改色结果固化到网格中",
    noDataPreview: "目前还没有像素数据，请先在上方上传图片。",
    exportOptions: "导出选项",
    onlySelected: "仅导出选区内容 (裁剪掉未选中像素)",
    exportTransparent: "导出透明背景PNG",
    exportWithBg: "导出带背景色PNG",
  },
  en: {
    title: "Pixel Color Relation Editor",
    subtitle: "Top: Basic Settings / Bottom: Left is Selection Pane (Editable), Right is Preview Pane (Read-only)",
    
    // Controls
    selectPixelSize: "Pixel Size:",
    pixelSizeHint: "Grid will be recalculated based on current image",
    uploadImage: "Upload Image:",
    canvasBgColor: "Canvas BG Color:",
    canvasBgHint: "Useful for transparent images. Try white, gray, etc.",
    
    // Grid Info
    currentGrid: "Current Grid: ",
    selectedPixels: " pixels",
    selectedPrefix: ", selected ",
    
    // Manual
    manualTitle: "Manual:",
    manualClick: "• Click: Select/Deselect single pixel",
    manualDrag: "• Drag: Select multiple (or deselect)",
    manualShiftDrag: "• Shift + Drag: Rectangular selection (applies on release)",
    manualBg: "• BG Color: Changes the background of transparent areas",
    
    // Pixel Canvas Panel
    selectionPane: "Selection Pane",
    confirmSelection: "Confirm Selection",
    modifySelection: "Modify Selection",
    noDataPixel: "No pixel data yet. Please upload an image first.",
    currentBaseColor: "Base Color:",
    keepLightness: "Keep Base Lightness",
    keepLightnessHint: "(Only Hue modification allowed when checked)",
    hintForBaseSwitch: "Hint: Right-click other pixels in selection to switch base point.",
    randomColor: "Random Color",
    
    // Preview Canvas Panel
    previewPane: "Preview Pane",
    saveChanges: "Save Changes",
    saveChangesTitle: "Bake current color changes into the grid",
    noDataPreview: "No pixel data yet. Please upload an image above.",
    exportOptions: "Export Options",
    onlySelected: "Export Selection Only (Crop unused)",
    exportTransparent: "Export Transparent PNG",
    exportWithBg: "Export PNG with BG Color",
  }
};
