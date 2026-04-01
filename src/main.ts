import type { DomRefs } from "./types";
import { createState } from "./state";
import { buildRegions } from "./content";
import { layoutAll, processReflows } from "./layout";
import { updateDog, updateWords, checkRegrowth, updateCrumbs, updatePointPopups, doPoop, doBark, tryScoop, updateScoopAnims } from "./physics";
import { drawBackground, drawObstacles, drawCrumbs, drawDogGlow, drawDog, drawPointPopups, drawCursor, drawCounter, drawTimer, drawScoopAnims, drawPoopHighlight, drawScoopHint } from "./renderer";
import { ROUND_DURATION } from "./constants";

export type GameCallbacks = {
  onRoundEnd: (score: number) => void;
};

// ── Boot (called from React) ───────────────────────────────────────

export type GameHandle = {
  cleanup: () => void;
  enableScoop: () => void;
};

export function boot(
  canvas: HTMLCanvasElement,
  textLayer: HTMLDivElement,
  stage: HTMLDivElement,
  callbacks: GameCallbacks,
): GameHandle {
  const ctx = canvas.getContext("2d")!;

  const refs: DomRefs = { canvas, ctx, textLayer, stage };
  const state = createState();
  let animId = 0;
  let disposed = false;
  let roundOverHandled = false;

  // ── Pointer helpers ────────────────────────────────────────────

  function updatePointerPos(clientX: number, clientY: number) {
    const r = stage.getBoundingClientRect();
    state.mouseX = Math.max(0, Math.min(state.stageW, clientX - r.left));
    state.mouseY = Math.max(0, Math.min(state.stageH, clientY - r.top));
  }

  // ── Resize ─────────────────────────────────────────────────────

  function resize() {
    state.stageW = stage.clientWidth;
    state.stageH = stage.clientHeight;
    canvas.width = state.stageW * state.dpr;
    canvas.height = state.stageH * state.dpr;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  function rebuildContent() {
    state.regionStates = buildRegions(state.stageW, state.stageH);
    layoutAll(state, refs);
  }

  // ── Event handlers ─────────────────────────────────────────────

  const onMouseMove = (e: MouseEvent) => {
    updatePointerPos(e.clientX, e.clientY);
    if (!state.mouseInStage) {
      state.mouseInStage = true;
      if (state.dog.x < -100) {
        state.dog.x = state.mouseX;
        state.dog.y = state.mouseY;
        state.prevMouseX = state.mouseX;
        state.prevMouseY = state.mouseY;
      }
    }
  };

  const onMouseLeave = () => { state.mouseInStage = false; };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      if (state.roundOver && state.scoopEnabled) {
        tryScoop(state, state.mouseX, state.mouseY);
      } else if (!state.roundOver) {
        doBark(state);
      }
    }
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    if (!state.roundOver) doPoop(state);
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    if (t) updatePointerPos(t.clientX, t.clientY);
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) {
      updatePointerPos(t.clientX, t.clientY);
      state.mouseInStage = true;
      if (state.dog.x < -100) {
        state.dog.x = state.mouseX;
        state.dog.y = state.mouseY;
        state.prevMouseX = state.mouseX;
        state.prevMouseY = state.mouseY;
      }
    }
  };

  const onTouchEnd = () => { state.mouseInStage = false; };

  const onResize = () => { resize(); rebuildContent(); };

  // ── Init ───────────────────────────────────────────────────────

  // Reset post-game visual state (for Play Again)
  textLayer.style.transition = "";
  textLayer.style.opacity = "1";
  stage.style.cursor = "";

  resize();
  rebuildContent();
  state.roundStartTime = performance.now();

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseleave", onMouseLeave);
  stage.addEventListener("mousedown", onMouseDown);
  stage.addEventListener("contextmenu", onContextMenu);
  stage.addEventListener("touchmove", onTouchMove, { passive: false });
  stage.addEventListener("touchstart", onTouchStart);
  stage.addEventListener("touchend", onTouchEnd);
  window.addEventListener("resize", onResize);

  // ── Main loop ──────────────────────────────────────────────────

  function loop(now: number) {
    if (disposed) return;

    const dt = state.lastTime === 0 ? 16 : Math.min(now - state.lastTime, 50);
    state.lastTime = now;
    const dtS = dt / 1000;

    // Check round timer
    const elapsed = now - state.roundStartTime;
    if (elapsed >= ROUND_DURATION && !state.roundOver) {
      state.roundOver = true;
      callbacks.onRoundEnd(state.dog.score);
    }

    // When round ends: show normal cursor immediately
    if (state.roundOver && !roundOverHandled) {
      roundOverHandled = true;
      stage.style.cursor = "default";
    }

    // Hide text layer when scoop mode is enabled (user viewed leaderboard)
    if (state.scoopEnabled && textLayer.style.opacity !== "0") {
      textLayer.style.transition = "opacity 0.5s";
      textLayer.style.opacity = "0";
    }

    const mdx = state.mouseX - state.prevMouseX;
    const mdy = state.mouseY - state.prevMouseY;
    if (dt > 0) {
      state.mouseSpeed = state.mouseSpeed * 0.7 + (Math.hypot(mdx, mdy) / dtS) * 0.3;
    }
    state.prevMouseX = state.mouseX;
    state.prevMouseY = state.mouseY;

    if (!state.roundOver) {
      updateDog(state, dtS);
      updateWords(state);
      checkRegrowth(state, now);
      processReflows(state, refs);
    }
    updateCrumbs(state, dtS);
    updatePointPopups(state, dtS);
    updateScoopAnims(state, dtS);

    // Screen shake
    if (state.shakeTimer > 0) {
      state.shakeTimer = Math.max(0, state.shakeTimer - dt);
      const intensity = (state.shakeTimer / 300) * 6;
      const sx = (Math.random() - 0.5) * intensity * 2;
      const sy = (Math.random() - 0.5) * intensity * 2;
      stage.style.transform = `translate(${sx}px, ${sy}px)`;
    } else {
      stage.style.transform = "";
    }

    // Update cursor when hovering near poop (post-game, scoop mode)
    if (state.roundOver && state.scoopEnabled) {
      let nearPoop = false;
      for (const o of state.obstacles) {
        if (Math.hypot(state.mouseX - o.x, state.mouseY - o.y) < o.radius + 25) {
          nearPoop = true;
          break;
        }
      }
      stage.style.cursor = nearPoop ? "pointer" : "default";
    }

    ctx.clearRect(0, 0, state.stageW, state.stageH);
    drawBackground(ctx, state.stageW, state.stageH);
    drawObstacles(ctx, state);
    drawCrumbs(ctx, state);

    if (state.roundOver && state.scoopEnabled) {
      // Post-game scoop mode: scoop anims and hint (cursor changes to pointer on hover)
      drawScoopAnims(ctx, state);
      drawScoopHint(ctx, state);
    } else if (state.roundOver) {
      // Post-game before scoop: just show poop and scoop anims
      drawScoopAnims(ctx, state);
    } else {
      drawCounter(ctx, state);
      drawTimer(ctx, state);

      if (state.dog.x > -100) {
        drawDogGlow(ctx, state);
        drawDog(ctx, state);
        drawPointPopups(ctx, state);
      }

      drawCursor(ctx, state);
    }

    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);

  // ── Cleanup ────────────────────────────────────────────────────

  return {
    cleanup() {
      disposed = true;
      cancelAnimationFrame(animId);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      stage.removeEventListener("mousedown", onMouseDown);
      stage.removeEventListener("contextmenu", onContextMenu);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
    },
    enableScoop() {
      state.scoopEnabled = true;
    },
  };
}
