export type Word = {
  id: number;
  text: string;
  el: HTMLDivElement;
  regionIndex: number;
  slotIndex: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  alive: boolean;
  color: string;
  scared: boolean;
  scaredAt: number;
};

export type TextRegion = {
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: string;
  lineHeight: number;
};

export type Crumb = {
  x: number;
  y: number;
  char: string;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
};

export type Obstacle = {
  x: number;
  y: number;
  type: "poop";
  radius: number;
};

export type PointPopup = {
  x: number;
  y: number;
  amount: number;
  age: number;       // seconds elapsed
  lifetime: number;  // total seconds before removal
};

export type ScoopAnim = {
  x: number;
  y: number;
  radius: number;
  progress: number; // 0→1 over duration
};

export type EatenRecord = {
  regionIndex: number;
  slotIndex: number;
  originalText: string;
  eatenAt: number;
};

export type RegionState = {
  region: TextRegion;
  originalTexts: string[];
  wordTexts: (string | null)[];
};

export type DomRefs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textLayer: HTMLDivElement;
  stage: HTMLDivElement;
};
