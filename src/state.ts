import type { Word, Crumb, Obstacle, EatenRecord, RegionState, PointPopup } from "./types";
import { MAX_FATNESS, FATNESS_PER_CHAR } from "./constants";

export type DogState = {
  x: number;
  y: number;
  facingRight: boolean;
  frame: number;
  frameTimer: number;
  mouthOpen: boolean;
  mouthTimer: number;
  tailWag: number;
  charsEaten: number;
  score: number;
  poopAnim: number;
  barkAnim: number;
};

export type GameState = {
  stageW: number;
  stageH: number;
  dpr: number;
  mouseX: number;
  mouseY: number;
  prevMouseX: number;
  prevMouseY: number;
  mouseSpeed: number;
  mouseInStage: boolean;
  dog: DogState;
  words: Word[];
  nextId: number;
  crumbs: Crumb[];
  obstacles: Obstacle[];
  eatenRecords: EatenRecord[];
  pointPopups: PointPopup[];
  regionStates: RegionState[];
  widthCache: Map<string, number>;
  reflowQueued: Set<number>;
  lastRegrowTime: number;
  lastTime: number;
  // Round state
  roundStartTime: number;
  roundOver: boolean;
  shakeTimer: number;
};

export function createState(): GameState {
  return {
    stageW: 0,
    stageH: 0,
    dpr: devicePixelRatio,
    mouseX: -500,
    mouseY: -500,
    prevMouseX: -500,
    prevMouseY: -500,
    mouseSpeed: 0,
    mouseInStage: false,
    dog: {
      x: -200,
      y: -200,
      facingRight: true,
      frame: 0,
      frameTimer: 0,
      mouthOpen: false,
      mouthTimer: 0,
      tailWag: 0,
      charsEaten: 0,
      score: 0,
      poopAnim: 0,
      barkAnim: 0,
    },
    words: [],
    nextId: 0,
    crumbs: [],
    obstacles: [],
    eatenRecords: [],
    pointPopups: [],
    regionStates: [],
    widthCache: new Map(),
    reflowQueued: new Set(),
    lastRegrowTime: 0,
    lastTime: 0,
    roundStartTime: 0,
    roundOver: false,
    shakeTimer: 0,
  };
}

export function fatness(state: GameState): number {
  return Math.min(MAX_FATNESS, 1 + state.dog.charsEaten * FATNESS_PER_CHAR);
}
