export type GridSize = 16 | 32;

export type Pixel = {
  r: number;
  g: number;
  b: number;
  a: number;
  selected: boolean;
};

export type PixelGrid = {
  size: GridSize;
  pixels: Pixel[];
};

export type Point = { x: number; y: number };
