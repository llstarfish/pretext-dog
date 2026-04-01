"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { drawDog } from "../src/renderer";
import { createState } from "../src/state";
import { CARTOON } from "../src/constants";

function getOrCreateUserId(): string {
  const key = "pretext-dog-user-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function StartPage() {
  const [introDone, setIntroDone] = useState(false);
  const [username, setUsername] = useState("");
  const [nameError, setNameError] = useState("");
  const [checking, setChecking] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  // Restore username (runs once on mount)
  useEffect(() => {
    const saved = localStorage.getItem("pretext-dog-username");
    if (saved) setUsername(saved);
  }, []);

  // ── Single canvas animation: intro → settle → idle ───────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    let W = window.innerWidth;
    let H = window.innerHeight;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Preload farm background
    const farmImg = new Image();
    farmImg.src = "/farm-bg.png";

    const state = createState();
    state.dog.facingRight = true;

    const t0 = performance.now();
    let animId: number;
    let introFinished = false;
    let settleStart = 0;

    // Timeline (ms)
    const BUBBLE_IN = 800;
    const BUBBLE_OUT = 3000;
    const RUN_START = 3600;
    const RUN_DUR = 2400;
    const RUN_END = RUN_START + RUN_DUR;
    const END = RUN_END + 500;
    const SETTLE_DUR = 600;

    function easeInOut(t: number): number {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Draw farm background with "cover" sizing, offset horizontally
    function drawFarmCover(offsetX: number) {
      if (!farmImg.complete) {
        ctx.fillStyle = "#c8a868";
        ctx.fillRect(offsetX, 0, W, H);
        return;
      }
      const ar = farmImg.width / farmImg.height;
      const sar = W / H;
      let dw: number, dh: number, dx: number, dy: number;
      if (sar > ar) {
        dw = W; dh = W / ar; dx = 0; dy = (H - dh) / 2;
      } else {
        dh = H; dw = H * ar; dx = (W - dw) / 2; dy = 0;
      }
      ctx.drawImage(farmImg, dx + offsetX, dy, dw, dh);
    }

    // Speech bubble above the dog
    function drawBubble(alpha: number) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;

      const txt = "Hi! My name is Agency.";
      ctx.font = `bold 22px ${CARTOON}`;
      const tw = ctx.measureText(txt).width;
      const pw = tw + 44;
      const ph = 50;
      const px = state.dog.x - pw / 2;
      const py = state.dog.y - 82 - ph;
      const cx = state.dog.x;

      // Rounded bubble
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 14);
      ctx.fill();
      ctx.strokeStyle = "#6b4f32";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Triangle pointer toward dog
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(cx - 9, py + ph - 1);
      ctx.lineTo(cx, py + ph + 15);
      ctx.lineTo(cx + 9, py + ph - 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#6b4f32";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 9, py + ph);
      ctx.lineTo(cx, py + ph + 15);
      ctx.lineTo(cx + 9, py + ph);
      ctx.stroke();
      // Cover inner border line
      ctx.fillStyle = "#fff";
      ctx.fillRect(cx - 10, py + ph - 4, 20, 5);

      // Text
      ctx.fillStyle = "#4a3520";
      ctx.font = `bold 22px ${CARTOON}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(txt, cx, py + ph / 2 + 1);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    function animate() {
      const now = performance.now();
      const el = now - t0;
      ctx.clearRect(0, 0, W, H);
      state.dog.tailWag = now / 300;

      const DOG_START_Y = H / 2 + 10;
      const DOG_END_Y = H / 2 - 190;

      if (!introFinished && el < RUN_START) {
        // ── INTRO: dark screen, dog in center, speech bubble ──
        ctx.fillStyle = "#111118";
        ctx.fillRect(0, 0, W, H);

        // Subtle warm spotlight behind the dog
        const g = ctx.createRadialGradient(W / 2, DOG_START_Y, 0, W / 2, DOG_START_Y, 140);
        g.addColorStop(0, "rgba(200, 180, 140, 0.07)");
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(W / 2, DOG_START_Y, 140, 0, Math.PI * 2);
        ctx.fill();

        state.dog.x = W / 2;
        state.dog.y = DOG_START_Y;
        state.dog.frame += 0.06; // idle
        drawDog(ctx, state);

        // Speech bubble fades in / holds / fades out
        if (el >= BUBBLE_IN) {
          let ba = 1;
          if (el < BUBBLE_IN + 400) ba = (el - BUBBLE_IN) / 400;
          if (el > BUBBLE_OUT) ba = Math.max(0, 1 - (el - BUBBLE_OUT) / 500);
          drawBubble(ba);
        }
      } else if (!introFinished && el < RUN_END) {
        // ── RUNNING: dark bg slides left, farm slides in from right ──
        const t = (el - RUN_START) / RUN_DUR;
        const scroll = easeInOut(t) * W;

        // Dark panel sliding left
        if (scroll < W) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, W - scroll, H);
          ctx.clip();
          ctx.fillStyle = "#111118";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }

        // Farm panel sliding in from right
        if (scroll > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(W - scroll, 0, scroll + 1, H);
          ctx.clip();
          drawFarmCover(W - scroll);
          ctx.restore();
        }

        // Dog runs in center (legs animate fast, decelerates at end)
        state.dog.x = W / 2;
        state.dog.y = DOG_START_Y;
        const legSpeed = t < 0.75 ? 0.7 : 0.7 * (1 - (t - 0.75) / 0.25) + 0.06;
        state.dog.frame += legSpeed;
        state.dog.facingRight = true;
        drawDog(ctx, state);
      } else {
        // ── ARRIVED / IDLE: farm bg, dog slides up then idles ──
        drawFarmCover(0);
        state.dog.x = W / 2;

        if (!introFinished && el >= END) {
          introFinished = true;
          settleStart = el;
          setIntroDone(true);
        }

        // Smoothly slide dog upward after intro finishes
        if (introFinished && settleStart > 0) {
          const t = Math.min(1, (el - settleStart) / SETTLE_DUR);
          state.dog.y = DOG_START_Y + (DOG_END_Y - DOG_START_Y) * easeInOut(t);
        } else {
          state.dog.y = DOG_START_Y;
        }

        state.dog.frame += 0.06;
        drawDog(ctx, state);
      }

      animId = requestAnimationFrame(animate);
    }

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  async function play() {
    const name = username.trim();
    if (!name || checking) return;
    setNameError("");
    setChecking(true);

    try {
      const userId = getOrCreateUserId();
      const res = await fetch(
        `/api/check-name?username=${encodeURIComponent(name)}&userId=${encodeURIComponent(userId)}`,
      );
      const data = await res.json();
      if (!data.available) {
        setNameError("This name is already taken. Please choose another.");
        setChecking(false);
        return;
      }
    } catch {
      // If check fails, allow play (server-side will still enforce on submit)
    }

    setChecking(false);
    localStorage.setItem("pretext-dog-username", name);
    router.push(`/play?username=${encodeURIComponent(name)}`);
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: "fixed", inset: 0, zIndex: 1 }}
      />
      {introDone && (
        <div className="start-overlay">
          <div className="start-card start-card-enter">
            <h1>Hungry Hungry Doggo</h1>
            <p>Eat as many words as you can in 30 seconds!</p>
            <input
              type="text"
              placeholder="Enter your name..."
              maxLength={30}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setNameError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && play()}
              autoFocus
            />
            {nameError && (
              <p style={{ color: "#e74c3c", fontSize: "14px", margin: "4px 0 0" }}>
                {nameError}
              </p>
            )}
            <button onClick={play} disabled={!username.trim() || checking}>
              {checking ? "Checking..." : "Play"}
            </button>
          </div>

          <div className="credit-bar credit-bar-enter">
            <span className="credit-label">Article credit:</span>
            <a
              className="credit-link"
              href="https://giansegato.com/essays/agency-is-eating-the-world"
              target="_blank"
              rel="noreferrer"
            >
              &ldquo;Agency is Eating the World&rdquo;
            </a>
            <span className="credit-author">by Gianluca Segato</span>
          </div>
        </div>
      )}
    </>
  );
}
