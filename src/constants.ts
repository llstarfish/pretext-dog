// Physics
export const FLEE_RADIUS = 150;
export const FLEE_FORCE = 13;
export const BASE_EAT_SPEED = 420;
export const EAT_RADIUS = 40;
export const BASE_DOG_LERP = 0.09;
export const OBSTACLE_REPEL_RADIUS = 65;
export const OBSTACLE_REPEL_FORCE = 20;
export const REGROW_DELAY = 5000;
export const REGROW_INTERVAL = 250;
export const MAX_FATNESS = 10.0;
export const FATNESS_PER_CHAR = 0.015;
export const BARK_RADIUS = 300;
export const BARK_FORCE = 60;

// Word steering (replaces spring/damping for character-like movement)
export const WORD_MAX_SPEED = 10;
export const WORD_ACCEL = 0.1;
export const ARRIVAL_RATE = 0.12;
export const FLEE_PUSH_DIST = 150;
export const SCARED_FRICTION = 0.97;
export const SCARED_RECOVERY_SPEED = 1.5;
export const SCARED_MIN_DURATION = 5000; // ms before scared words can recover
export const SCARED_HESITATION = 150;    // ms of freeze before fleeing
export const SCARED_ACCEL = 0.6;         // max flee acceleration (ramps up)
export const SCARED_RAMP_TIME = 800;     // ms to reach full flee speed

// Fonts — Stardew Valley cozy style
export const CARTOON =
  '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const SERIF =
  'Georgia, "Times New Roman", "Palatino Linotype", serif';

// Stardew Valley harvest palette — dark for readability on busy bg
export const PALETTE = [
  "#8a2020", // berry red
  "#7a4810", // pumpkin orange
  "#5a5008", // wheat gold
  "#1e4a12", // grass green
  "#1a4568", // pond blue
  "#4a2a10", // wood brown
  "#702040", // flower pink
  "#104a2a", // fern green
  "#6a3008", // autumn orange
  "#2a3560", // twilight blue
  "#4a2a10", // chestnut
  "#205018", // leaf green
];

// Poop scoring — sub-linear: frequent small poops beat one big poop
export const POOP_SCORE_K = 3.56;
export const POOP_SCORE_P = 0.75;

// Round
export const ROUND_DURATION = 30_000; // 30 seconds

// Cache limits
export const WIDTH_CACHE_MAX = 2000;

// Fence boundaries (fractions of the 1536×1024 background image)
const BG_ASPECT = 1536 / 1024;
const FENCE_IMG_LEFT = 0.08;
const FENCE_IMG_RIGHT = 0.93;
const FENCE_IMG_TOP = 0.18;
const FENCE_IMG_BOTTOM = 0.89;

export function getFenceBounds(stageW: number, stageH: number) {
  const stageAR = stageW / stageH;
  let displayW: number, displayH: number, offsetX: number, offsetY: number;

  if (stageAR > BG_ASPECT) {
    // Stage wider than image — fit width, crop height
    displayW = stageW;
    displayH = stageW / BG_ASPECT;
    offsetX = 0;
    offsetY = (stageH - displayH) / 2;
  } else {
    // Stage taller than image — fit height, crop width
    displayH = stageH;
    displayW = stageH * BG_ASPECT;
    offsetX = (stageW - displayW) / 2;
    offsetY = 0;
  }

  return {
    left: Math.max(0, offsetX + FENCE_IMG_LEFT * displayW),
    right: Math.min(stageW, offsetX + FENCE_IMG_RIGHT * displayW),
    top: Math.max(0, offsetY + FENCE_IMG_TOP * displayH),
    bottom: Math.min(stageH, offsetY + FENCE_IMG_BOTTOM * displayH),
  };
}
