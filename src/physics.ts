import type { Word, Obstacle } from "./types";
import {
  FLEE_RADIUS, FLEE_FORCE,
  BASE_EAT_SPEED, EAT_RADIUS, BASE_DOG_LERP,
  OBSTACLE_REPEL_RADIUS, OBSTACLE_REPEL_FORCE,
  REGROW_DELAY, REGROW_INTERVAL,
  BARK_RADIUS, CARTOON,
  POOP_SCORE_K, POOP_SCORE_P,
  WORD_MAX_SPEED, WORD_ACCEL, ARRIVAL_RATE, FLEE_PUSH_DIST,
  SCARED_FRICTION, SCARED_RECOVERY_SPEED, SCARED_MIN_DURATION,
  SCARED_HESITATION, SCARED_ACCEL, SCARED_RAMP_TIME,
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
  const stiffness = BASE_DOG_LERP / (1 + (f - 1) * 0.35);
  // Heavier dog = more friction, but still responsive enough to feel fun
  const damping = 0.82 / (1 + (f - 1) * 0.12);

  // Spring-damper: accelerate toward cursor, friction slows down
  const dx = state.mouseX - dog.x;
  const dy = state.mouseY - dog.y;
  dog.vx += dx * stiffness;
  dog.vy += dy * stiffness;
  dog.vx *= damping;
  dog.vy *= damping;
  dog.x += dog.vx;
  dog.y += dog.vy;

  const speed = Math.hypot(dog.vx, dog.vy);

  if (speed > 0.5) dog.facingRight = dog.vx > 0;

  // Smoothly ramp walkSpeed up/down for animation blending
  const targetWalk = Math.min(speed / 3, 1);
  dog.walkSpeed += (targetWalk - dog.walkSpeed) * 0.12;

  // Tail wag: faster when moving, gentle idle sway when still
  const tailRate = 0.06 + dog.walkSpeed * 0.12;
  dog.tailWag += tailRate * dt * 60;

  // Walk cycle: frame advances proportional to walkSpeed
  if (dog.walkSpeed > 0.02) {
    dog.frameTimer += dt * 1000 * dog.walkSpeed;
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
      // Scared words: freeze briefly, then gradually accelerate away
      const elapsed = performance.now() - w.scaredAt;

      if (elapsed < SCARED_HESITATION) {
        // Hesitation: freeze in fear
        w.vx *= 0.8;
        w.vy *= 0.8;
      } else {
        // Ramp up flee acceleration (quadratic ease-in: slow start, then fast)
        const rampT = Math.min((elapsed - SCARED_HESITATION) / SCARED_RAMP_TIME, 1);
        const accelFactor = 0.1 + 0.9 * rampT * rampT;

        const scaredFleeRadius = FLEE_RADIUS * 2.5;
        if (dist < scaredFleeRadius && dist > 0 && state.mouseInStage) {
          // Fade out flee force at close range so dog can catch up and eat
          const closeFade = Math.min(1, Math.max(0, (dist - EAT_RADIUS) / (EAT_RADIUS * 2)));
          const accel = SCARED_ACCEL * accelFactor * closeFade;
          w.vx += (dx / dist) * accel;
          w.vy += (dy / dist) * accel;
        }

        applyObstacleRepulsion(w, state.obstacles);

        w.vx *= SCARED_FRICTION;
        w.vy *= SCARED_FRICTION;
      }

      w.x += w.vx;
      w.y += w.vy;

      // Clamp to fence
      if (w.x < fence.left) { w.x = fence.left; w.vx = Math.abs(w.vx) * 0.3; }
      if (w.x + w.width > fence.right) { w.x = fence.right - w.width; w.vx = -Math.abs(w.vx) * 0.3; }
      if (w.y < fence.top) { w.y = fence.top; w.vy = Math.abs(w.vy) * 0.3; }
      if (w.y + w.height > fence.bottom) { w.y = fence.bottom - w.height; w.vy = -Math.abs(w.vy) * 0.3; }

      // Recover once minimum scare time has passed, momentum has dissipated, and dog is far enough
      const speed = Math.hypot(w.vx, w.vy);
      const scaredElapsed = performance.now() - w.scaredAt;
      if (speed < SCARED_RECOVERY_SPEED && dist > FLEE_RADIUS * 1.5 && scaredElapsed > SCARED_MIN_DURATION) {
        w.scared = false;
      }
    } else {
      // Normal words: steer toward a target that shifts away from the dog
      let targetX = w.homeX;
      let targetY = w.homeY;

      if (dist < FLEE_RADIUS && dist > 0 && state.mouseInStage) {
        const s = 1 - dist / FLEE_RADIUS;
        const pushDist = s * s * FLEE_PUSH_DIST;
        targetX += (dx / dist) * pushDist;
        targetY += (dy / dist) * pushDist;
      }

      applyObstacleRepulsion(w, state.obstacles);

      // Steering: compute desired velocity, then smoothly adjust toward it
      const toX = targetX - w.x;
      const toY = targetY - w.y;
      const toDist = Math.hypot(toX, toY);

      if (toDist > 0.5) {
        const arrivalSpeed = Math.min(toDist * ARRIVAL_RATE, WORD_MAX_SPEED);
        const desiredVx = (toX / toDist) * arrivalSpeed;
        const desiredVy = (toY / toDist) * arrivalSpeed;
        w.vx += (desiredVx - w.vx) * WORD_ACCEL;
        w.vy += (desiredVy - w.vy) * WORD_ACCEL;
      } else {
        w.vx *= 0.8;
        w.vy *= 0.8;
      }

      w.x += w.vx;
      w.y += w.vy;

      // Clamp to fence
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
      (dog.barkAnim === 0 || w.scared)
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

  // Point popup above the dog — higher scores linger longer
  state.pointPopups.push({
    x: state.dog.x,
    y: state.dog.y - 30 * fatness(state),
    amount: points,
    age: 0,
    lifetime: 0.9 + Math.min(points, 30) * 0.04,
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
  // Bigger belly → bigger poop (sub-linear so it doesn't get absurd)
  const poopScale = Math.min(2.0, 0.8 + Math.sqrt(n) * 0.0537);
  state.obstacles.push({
    x: state.dog.x,
    y: state.dog.y + 20 * f,
    type: "poop",
    radius: 28 * poopScale,
  });

  // Poop bonus popup — higher scores linger longer
  state.pointPopups.push({
    x: state.dog.x,
    y: state.dog.y - 30 * f,
    amount: poopBonus,
    age: 0,
    lifetime: 1.2 + Math.min(poopBonus, 30) * 0.04,
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
      // No impulse — freeze in place, then gradually flee
      w.vx *= 0.2;
      w.vy *= 0.2;
      w.scared = true;
      w.scaredAt = performance.now();
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

// ── Poop scooping (post-game) ──────────────────────────────────────

export function tryScoop(state: GameState, clickX: number, clickY: number): boolean {
  for (let i = state.obstacles.length - 1; i >= 0; i--) {
    const o = state.obstacles[i];
    const dist = Math.hypot(clickX - o.x, clickY - o.y);
    if (dist < o.radius + 25) {
      state.scoopAnims.push({
        x: o.x,
        y: o.y,
        radius: o.radius,
        progress: 0,
      });
      state.obstacles.splice(i, 1);
      return true;
    }
  }
  return false;
}

export function updateScoopAnims(state: GameState, dt: number) {
  for (let i = state.scoopAnims.length - 1; i >= 0; i--) {
    const s = state.scoopAnims[i];
    s.progress += dt / 0.8; // 800ms total
    if (s.progress >= 1) {
      state.scoopAnims.splice(i, 1);
    }
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
