import type { DomRefs } from "./types";
import { createState } from "./state";
import { buildRegions } from "./content";
import { layoutAll, processReflows } from "./layout";
import { updateDog, updateWords, checkRegrowth, updateCrumbs, updatePointPopups, doPoop, doBark } from "./physics";
import { drawBackground, drawObstacles, drawCrumbs, drawDogGlow, drawDog, drawPointPopups, drawCursor, drawCounter, drawTimer } from "./renderer";
import { ROUND_DURATION } from "./constants";

export type GameCallbacks = {
  onRoundEnd: (score: number) => void;
};

// ── Boot (called from React) ───────────────────────────────────────

export function boot(
  canvas: HTMLCanvasElement,
  textLayer: HTMLDivElement,
  stage: HTMLDivElement,
  callbacks: GameCallbacks,
): () => void {
  const ctx = canvas.getContext("2d")!;

  const refs: DomRefs = { canvas, ctx, textLayer, stage };
  const state = createState();
  let animId = 0;
  let disposed = false;

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
    if (e.button === 0 && !state.roundOver) doBark(state);
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

    ctx.clearRect(0, 0, state.stageW, state.stageH);
    drawBackground(ctx, state.stageW, state.stageH);
    drawObstacles(ctx, state);
    drawCrumbs(ctx, state);
    drawCounter(ctx, state);
    drawTimer(ctx, state);

    if (state.dog.x > -100) {
      drawDogGlow(ctx, state);
      drawDog(ctx, state);
      drawPointPopups(ctx, state);
    }

    drawCursor(ctx, state);

    animId = requestAnimationFrame(loop);
  }

  animId = requestAnimationFrame(loop);

  // ── Cleanup ────────────────────────────────────────────────────

  return () => {
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
  };
}
