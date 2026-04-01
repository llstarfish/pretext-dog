import type { Word, Obstacle } from "./types";
import {
  FLEE_RADIUS, FLEE_FORCE, FLEE_DAMPING, HOME_SPRING,
  BASE_EAT_SPEED, EAT_RADIUS, BASE_DOG_LERP,
  OBSTACLE_REPEL_RADIUS, OBSTACLE_REPEL_FORCE,
  REGROW_DELAY, REGROW_INTERVAL,
  BARK_RADIUS, BARK_FORCE, CARTOON,
  POOP_SCORE_K, POOP_SCORE_P,
  getFenceBounds,
} from "./constants";
import { type GameState, fatness } from "./state";

// ── Dog ─────────────────────────────────────────────────────────────

export function updateDog(state: GameState, dt: number) {
  if (!state.mouseInStage) return;
  const dog = state.dog;

  if (dog.poopAnim > 0) dog.poopAnim = Math.max(0, dog.poopAnim - dt * 1000);
  if (dog.barkAnim > 0) dog.barkAnim = Math.max(0, dog.barkAnim - dt * 1000);

  const f = fatness(state);
  const lerp = BASE_DOG_LERP / f;

  dog.x += (state.mouseX - dog.x) * lerp;
  dog.y += (state.mouseY - dog.y) * lerp;

  const dx = state.mouseX - dog.x;
  if (Math.abs(dx) > 2) dog.facingRight = dx > 0;
  dog.tailWag += 0.15 * dt * 60;

  if (Math.hypot(dx, state.mouseY - dog.y) > 5) {
    dog.frameTimer += dt * 1000;
    if (dog.frameTimer > 80) {
      dog.frameTimer = 0;
      dog.frame++;
    }
  }

  if (dog.mouthTimer > 0) {
    dog.mouthTimer -= dt * 1000;
    if (dog.mouthTimer <= 0) dog.mouthOpen = false;
  }
}

// ── Word physics ────────────────────────────────────────────────────

function applyObstacleRepulsion(w: Word, obstacles: Obstacle[]) {
  const wcx = w.x + w.width / 2;
  const wcy = w.y + w.height / 2;
  for (const obs of obstacles) {
    const dx = wcx - obs.x;
    const dy = wcy - obs.y;
    const d = Math.hypot(dx, dy);
    if (d < OBSTACLE_REPEL_RADIUS && d > 0) {
      const s = 1 - d / OBSTACLE_REPEL_RADIUS;
      w.vx += (dx / d) * s * OBSTACLE_REPEL_FORCE;
      w.vy += (dy / d) * s * OBSTACLE_REPEL_FORCE;
    }
  }
}

export function updateWords(state: GameState) {
  const toEat: Word[] = [];
  const f = fatness(state);
  const eatThreshold = BASE_EAT_SPEED * f;
  const dog = state.dog;
  const fence = getFenceBounds(state.stageW, state.stageH);

  for (const w of state.words) {
    if (!w.alive) continue;

    const wcx = w.x + w.width / 2;
    const wcy = w.y + w.height / 2;
    const dx = wcx - dog.x;
    const dy = wcy - dog.y;
    const dist = Math.hypot(dx, dy);

    if (w.scared) {
      // Scared words: flee from dog at longer range, no spring home
      const scaredFleeRadius = FLEE_RADIUS * 2;
      if (dist < scaredFleeRadius && dist > 0 && state.mouseInStage) {
        const s = 1 - dist / scaredFleeRadius;
        w.vx += (dx / dist) * s * FLEE_FORCE * 1.5;
        w.vy += (dy / dist) * s * FLEE_FORCE * 1.5;
      }

      applyObstacleRepulsion(w, state.obstacles);

      // Gentle friction (no spring home)
      w.vx *= 0.96;
      w.vy *= 0.96;
      w.x += w.vx;
      w.y += w.vy;

      // Bounce off fence boundaries
      if (w.x < fence.left) { w.x = fence.left; w.vx = Math.abs(w.vx) * 0.5; }
      if (w.x + w.width > fence.right) { w.x = fence.right - w.width; w.vx = -Math.abs(w.vx) * 0.5; }
      if (w.y < fence.top) { w.y = fence.top; w.vy = Math.abs(w.vy) * 0.5; }
      if (w.y + w.height > fence.bottom) { w.y = fence.bottom - w.height; w.vy = -Math.abs(w.vy) * 0.5; }
    } else {
      // Normal words: flee from dog + spring home
      if (dist < FLEE_RADIUS && dist > 0 && state.mouseInStage) {
        const s = 1 - dist / FLEE_RADIUS;
        w.vx += (dx / dist) * s * s * FLEE_FORCE;
        w.vy += (dy / dist) * s * s * FLEE_FORCE;
      }

      applyObstacleRepulsion(w, state.obstacles);

      w.vx += (w.homeX - w.x) * HOME_SPRING;
      w.vy += (w.homeY - w.y) * HOME_SPRING;
      w.vx *= FLEE_DAMPING;
      w.vy *= FLEE_DAMPING;
      w.x += w.vx;
      w.y += w.vy;

      // Clamp normal words to fence too
      w.x = Math.max(fence.left, Math.min(fence.right - w.width, w.x));
      w.y = Math.max(fence.top, Math.min(fence.bottom - w.height, w.y));
    }

    const tx = w.x - w.homeX;
    const ty = w.y - w.homeY;
    w.el.style.transform = `translate(${tx}px, ${ty}px)`;

    if (
      dist < EAT_RADIUS &&
      state.mouseSpeed > eatThreshold &&
      state.mouseInStage &&
      dog.poopAnim === 0 &&
      dog.barkAnim === 0
    ) {
      toEat.push(w);
    }
  }

  for (const w of toEat) eatWord(state, w);
}

function eatWord(state: GameState, w: Word) {
  const points = w.text.length;
  state.dog.charsEaten += points;
  state.dog.score += points;

  w.alive = false;
  w.el.classList.add("eaten");
  setTimeout(() => w.el.remove(), 220);

  state.regionStates[w.regionIndex].wordTexts[w.slotIndex] = null;
  const idx = state.words.indexOf(w);
  if (idx !== -1) state.words.splice(idx, 1);

  state.reflowQueued.add(w.regionIndex);

  state.eatenRecords.push({
    regionIndex: w.regionIndex,
    slotIndex: w.slotIndex,
    originalText: state.regionStates[w.regionIndex].originalTexts[w.slotIndex],
    eatenAt: performance.now(),
  });

  state.dog.mouthOpen = true;
  state.dog.mouthTimer = 260;

  // Point popup above the dog
  state.pointPopups.push({
    x: state.dog.x,
    y: state.dog.y - 30 * fatness(state),
    amount: points,
    age: 0,
    lifetime: 0.9,
  });

  const cx = w.x + w.width / 2;
  const cy = w.y + w.height / 2;
  for (let i = 0; i < 6; i++) {
    state.crumbs.push({
      x: cx,
      y: cy,
      char: w.text[Math.floor(Math.random() * w.text.length)] ?? "\u00B7",
      vx: (Math.random() - 0.5) * 200,
      vy: -70 - Math.random() * 130,
      alpha: 0.9,
      size: 10 + Math.random() * 6,
      color: w.color,
    });
  }
}

// ── Interactions ────────────────────────────────────────────────────

export function doPoop(state: GameState) {
  if (!state.mouseInStage || state.dog.poopAnim > 0 || state.dog.barkAnim > 0) return;
  if (state.dog.charsEaten === 0) return;

  // Sub-linear poop bonus: frequent small poops beat hoarding
  const n = state.dog.charsEaten;
  const poopBonus = Math.round(POOP_SCORE_K * Math.pow(n, POOP_SCORE_P));
  state.dog.score += poopBonus;

  const f = fatness(state);
  state.obstacles.push({
    x: state.dog.x,
    y: state.dog.y + 20 * f,
    type: "poop",
    radius: 28,
  });

  // Poop bonus popup
  state.pointPopups.push({
    x: state.dog.x,
    y: state.dog.y - 30 * f,
    amount: poopBonus,
    age: 0,
    lifetime: 1.2,
  });

  state.dog.charsEaten = 0;
  state.dog.poopAnim = 500;
}

export function doBark(state: GameState) {
  if (!state.mouseInStage || state.dog.poopAnim > 0 || state.dog.barkAnim > 0) return;

  state.dog.barkAnim = 350;
  state.dog.mouthOpen = true;
  state.dog.mouthTimer = 350;
  state.shakeTimer = 300;

  for (const w of state.words) {
    if (!w.alive) continue;
    const dx = (w.x + w.width / 2) - state.dog.x;
    const dy = (w.y + w.height / 2) - state.dog.y;
    const dist = Math.hypot(dx, dy);
    if (dist < BARK_RADIUS && dist > 0) {
      const strength = 1 - dist / BARK_RADIUS;
      w.vx += (dx / dist) * strength * BARK_FORCE;
      w.vy += (dy / dist) * strength * BARK_FORCE;
      w.scared = true;
    }
  }
}

// ── Regrowth ────────────────────────────────────────────────────────

export function checkRegrowth(state: GameState, now: number) {
  if (now - state.lastRegrowTime < REGROW_INTERVAL) return;
  if (state.eatenRecords.length === 0) return;

  // Iterate backwards to avoid skipping entries when splicing
  for (let i = state.eatenRecords.length - 1; i >= 0; i--) {
    const rec = state.eatenRecords[i];
    if (now - rec.eatenAt > REGROW_DELAY) {
      state.regionStates[rec.regionIndex].wordTexts[rec.slotIndex] =
        rec.originalText;
      state.eatenRecords.splice(i, 1);
      state.reflowQueued.add(rec.regionIndex);
      state.lastRegrowTime = now;
      return;
    }
  }
}

// ── Point popups ───────────────────────────────────────────────────

export function updatePointPopups(state: GameState, dt: number) {
  for (let i = state.pointPopups.length - 1; i >= 0; i--) {
    const p = state.pointPopups[i];
    p.age += dt;
    p.y -= 40 * dt; // float upward
    if (p.age >= p.lifetime) state.pointPopups.splice(i, 1);
  }
}

// ── Crumbs ──────────────────────────────────────────────────────────

export function updateCrumbs(state: GameState, dt: number) {
  for (let i = state.crumbs.length - 1; i >= 0; i--) {
    const c = state.crumbs[i];
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.vy += 220 * dt;
    c.alpha -= 1.6 * dt;
    if (c.alpha <= 0) state.crumbs.splice(i, 1);
  }
}
