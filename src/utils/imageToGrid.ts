import type { GridSize, Pixel, PixelGrid } from "../types/pixel";

export async function dataUrlToPixelGrid(imageSrc: string, gridSize: GridSize): Promise<PixelGrid> {
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });

  const hidden = document.createElement("canvas");
  hidden.width = gridSize;
  hidden.height = gridSize;
  const hctx = hidden.getContext("2d");
  if (!hctx) throw new Error("No 2D context");

  hctx.drawImage(img, 0, 0, gridSize, gridSize);
  const imageData = hctx.getImageData(0, 0, gridSize, gridSize);
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

  return { size: gridSize, pixels };
}
