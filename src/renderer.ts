import { CARTOON, BARK_RADIUS, BASE_EAT_SPEED, ROUND_DURATION } from "./constants";
import { type GameState, fatness } from "./state";

// ── Canvas draw functions ──────────────────────────────────────────

export function drawBackground(_ctx: CanvasRenderingContext2D, _stageW: number, _stageH: number) {
  // Background is pure CSS — nothing to draw
}

export function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const o of state.obstacles) drawPoop(ctx, o.x, o.y, o.radius);
}

function drawPoop(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const scale = radius / 28;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(2, 11, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#6B4226";
  ctx.beginPath();
  ctx.ellipse(0, 6, 13, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7B5230";
  ctx.beginPath();
  ctx.ellipse(-1, 0, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8B6340";
  ctx.beginPath();
  ctx.ellipse(0, -5, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8B6340";
  ctx.beginPath();
  ctx.ellipse(1, -9, 4, 3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(-2, -7, 2, 1.5, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Stink waves
  ctx.strokeStyle = "rgba(130, 180, 30, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  const t = performance.now() / 800;
  for (let i = 0; i < 3; i++) {
    const sx = -6 + i * 6;
    const drift = Math.sin(t + i) * 2;
    ctx.beginPath();
    ctx.moveTo(sx, -14);
    ctx.quadraticCurveTo(sx + drift + 2, -20, sx + drift - 1, -26);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawCrumbs(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const c of state.crumbs) {
    ctx.globalAlpha = c.alpha;
    ctx.font = `bold ${c.size}px ${CARTOON}`;
    ctx.fillStyle = c.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(c.char, c.x, c.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

export function drawDogGlow(ctx: CanvasRenderingContext2D, state: GameState) {
  const f = fatness(state);
  const thresh = BASE_EAT_SPEED * f;
  const t = (state.mouseSpeed - thresh * 0.6) / (thresh * 0.4);
  if (t <= 0) return;

  const a = Math.min(t, 1) * 0.22;
  const vf = 1 + Math.pow(Math.max(0, f - 1), 0.7) * 0.7;
  const r = 45 * vf;
  const dog = state.dog;
  const g = ctx.createRadialGradient(dog.x, dog.y, 0, dog.x, dog.y, r);
  g.addColorStop(0, `rgba(255, 200, 50, ${a})`);
  g.addColorStop(1, "rgba(255, 200, 50, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(dog.x, dog.y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDog(ctx: CanvasRenderingContext2D, state: GameState) {
  const rawF = fatness(state);
  // Visual fatness: sub-linear curve keeps the dog cute when chubby
  const f = 1 + Math.pow(Math.max(0, rawF - 1), 0.75) * 0.85;
  const hf = 1 + Math.pow(Math.max(0, rawF - 1), 0.75) * 0.65;
  const dog = state.dog;

  ctx.save();
  ctx.translate(dog.x, dog.y);

  const squatting = dog.poopAnim > 0;
  const barking = dog.barkAnim > 0;

  if (!dog.facingRight) ctx.scale(-1, 1);
  if (squatting) ctx.translate(0, 6);

  // Charming waddle tilt when chubby and walking
  if (f > 1.2 && dog.walkSpeed > 0.05 && !squatting) {
    ctx.rotate(Math.sin(dog.frame * 0.15) * (f - 1) * 0.025 * Math.min(dog.walkSpeed, 1));
  }

  // Blend between idle breathing and walk bounce based on walkSpeed
  const idleBob = Math.sin(performance.now() / 600) * 1.2;
  const walkBob = Math.sin(dog.frame * 0.3) * (2 + (f - 1) * 1);
  const bob = squatting ? 0 : idleBob * (1 - dog.walkSpeed) + walkBob * dog.walkSpeed;

  // Shadow
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 28 + (f - 1) * 8, 26 * f, 7 * f, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Tail (drawn behind body)
  ctx.strokeStyle = "#c8944a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const ta = Math.sin(dog.tailWag) * 0.6;
  ctx.beginPath();
  ctx.moveTo(-20 * f, bob - 4);
  ctx.quadraticCurveTo(-30 * f, bob - 18 + Math.sin(ta) * 8, -26 * f, bob - 24 + Math.cos(ta) * 6);
  ctx.stroke();
  // Tail tip
  ctx.fillStyle = "#e8c888";
  ctx.beginPath();
  ctx.arc(-26 * f, bob - 24 + Math.cos(ta) * 6, 4, 0, Math.PI * 2);
  ctx.fill();

  // Back legs (behind body)
  ctx.fillStyle = "#a07030";
  const legLen = Math.max(8, 14 - (f - 1) * 2.5);
  const legW = 6 + (f - 1) * 2;
  const pawRx = 5 + (f - 1) * 0.5;
  const pawRy = 3 + (f - 1) * 0.3;
  const lp = dog.frame * 0.5;
  const fl = squatting ? 0 : Math.sin(lp) * 4 * dog.walkSpeed;
  const bl = squatting ? 0 : Math.sin(lp + Math.PI) * 4 * dog.walkSpeed;
  const legY = bob + 10 * f;

  ctx.beginPath();
  ctx.roundRect(-18 * f, legY, legW, legLen + fl, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-12 * f, legY, legW, legLen + bl, 2);
  ctx.fill();

  // Back paws
  ctx.fillStyle = "#e8c888";
  const pawY = legY + legLen;
  ctx.beginPath(); ctx.ellipse(-15 * f, pawY + fl, pawRx, pawRy, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-9 * f, pawY + bl, pawRx, pawRy, 0, 0, Math.PI * 2); ctx.fill();

  // Body
  ctx.fillStyle = "#c8944a";
  ctx.beginPath();
  ctx.ellipse(0, bob, 22 * f, 14 * f, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body outline
  ctx.strokeStyle = "#9a6a2a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, bob, 22 * f, 14 * f, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Belly
  ctx.fillStyle = "#edd9a8";
  ctx.beginPath();
  ctx.ellipse(2, bob + 4 * f, 16 * f, 8 * f, 0, 0, Math.PI);
  ctx.fill();

  // Body spot (patch of darker fur)
  ctx.fillStyle = "rgba(160, 112, 48, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-6 * f, bob - 4, 8 * f, 6 * f, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Collar
  ctx.fillStyle = "#d44040";
  ctx.beginPath();
  ctx.ellipse(12 * hf, bob + 1, 10 * hf, 5 * hf, 0.15, 0, Math.PI);
  ctx.fill();
  // Collar outline
  ctx.strokeStyle = "#a02020";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(12 * hf, bob + 1, 10 * hf, 5 * hf, 0.15, 0, Math.PI);
  ctx.stroke();
  // Collar tag
  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(14 * hf, bob + 6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b8960a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(14 * hf, bob + 6, 3, 0, Math.PI * 2);
  ctx.stroke();

  // Front legs (in front of body)
  ctx.fillStyle = "#a07030";
  ctx.beginPath();
  ctx.roundRect(12 * f, legY, legW, legLen + fl, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(6 * f, legY, legW, legLen + bl, 2);
  ctx.fill();

  // Front paws
  ctx.fillStyle = "#e8c888";
  ctx.beginPath(); ctx.ellipse(15 * f, pawY + fl, pawRx, pawRy, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9 * f, pawY + bl, pawRx, pawRy, 0, 0, Math.PI * 2); ctx.fill();

  // Head
  ctx.fillStyle = "#c8944a";
  ctx.beginPath();
  ctx.ellipse(20 * hf, bob - 6, 13 * hf, 11 * hf, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Head outline
  ctx.strokeStyle = "#9a6a2a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(20 * hf, bob - 6, 13 * hf, 11 * hf, 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Head patch (forehead spot)
  ctx.fillStyle = "rgba(160, 112, 48, 0.3)";
  ctx.beginPath();
  ctx.ellipse(18 * hf, bob - 12, 5 * hf, 4 * hf, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Ear (back, slightly darker)
  ctx.fillStyle = "#8a5a20";
  ctx.beginPath();
  ctx.ellipse(12 * hf, bob - 17, 5.5, 9, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c08040";
  ctx.beginPath();
  ctx.ellipse(12 * hf, bob - 16, 3.5, 6.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Ear inner pink
  ctx.fillStyle = "rgba(220, 160, 140, 0.4)";
  ctx.beginPath();
  ctx.ellipse(12 * hf, bob - 15, 2, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = "#edd9a8";
  ctx.beginPath();
  ctx.ellipse(30 * hf, bob - 2, 8 * hf, 6 * hf, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.ellipse(36 * hf, bob - 3, 3.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose shine
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(35.5 * hf, bob - 4, 1.5, 1, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  if (dog.mouthOpen) {
    ctx.fillStyle = "#c33";
    ctx.beginPath();
    ctx.ellipse(32 * hf, bob + 3, 7, 5, 0.1, 0, Math.PI);
    ctx.fill();
    // Tongue
    ctx.fillStyle = "#f08080";
    ctx.beginPath();
    ctx.ellipse(33 * hf, bob + 6, 3.5, 5, 0.2, 0, Math.PI);
    ctx.fill();
    // Teeth
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(27 * hf, bob + 3);
    ctx.lineTo(28.5 * hf, bob + 5);
    ctx.lineTo(30 * hf, bob + 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(34 * hf, bob + 3);
    ctx.lineTo(35.5 * hf, bob + 5);
    ctx.lineTo(37 * hf, bob + 3);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(30 * hf, bob + 1);
    ctx.quadraticCurveTo(33 * hf, bob + 4, 36 * hf, bob + 2);
    ctx.stroke();
    // Happy smile curve
    ctx.beginPath();
    ctx.moveTo(36 * hf, bob + 2);
    ctx.quadraticCurveTo(37 * hf, bob + 1, 37.5 * hf, bob);
    ctx.stroke();
  }

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(24 * hf, bob - 10, 6.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye outline
  ctx.strokeStyle = "#6a4a2a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(24 * hf, bob - 10, 6.5, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Iris
  ctx.fillStyle = "#3a2010";
  ctx.beginPath();
  ctx.ellipse(25.5 * hf, bob - 9.5, 3.5, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupil
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.ellipse(26 * hf, bob - 9.5, 2, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye highlight
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(27 * hf, bob - 11.5, 2, 0, Math.PI * 2);
  ctx.fill();
  // Second tiny highlight
  ctx.beginPath();
  ctx.arc(24 * hf, bob - 8, 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrow
  ctx.strokeStyle = "#7a5020";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(19 * hf, bob - 16);
  ctx.quadraticCurveTo(24 * hf, bob - 18, 29 * hf, bob - 16);
  ctx.stroke();

  // Rosy cheeks (more pronounced when chubby)
  const cheekAlpha = Math.min(0.25 + (f - 1) * 0.06, 0.5);
  ctx.fillStyle = `rgba(255, 120, 120, ${cheekAlpha})`;
  ctx.beginPath();
  ctx.ellipse(29 * hf, bob + 1, 5 + (f - 1) * 1, 3 + (f - 1) * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Whisker dots
  ctx.fillStyle = "rgba(100, 70, 40, 0.3)";
  for (const wy of [-1, 1, 3]) {
    ctx.beginPath();
    ctx.arc(34 * hf, bob + wy, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bark effects
  if (barking) {
    const bp = 1 - dog.barkAnim / 350; // 0→1 over bark duration
    const mouthX = 30 * hf;
    const mouthY = bob;

    // 1. Radial flash burst (centered on dog)
    if (bp < 0.2) {
      const flashA = (1 - bp / 0.2) * 0.3;
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, BARK_RADIUS);
      gr.addColorStop(0, `rgba(255, 240, 180, ${flashA})`);
      gr.addColorStop(0.4, `rgba(255, 220, 80, ${flashA * 0.3})`);
      gr.addColorStop(1, "rgba(255, 220, 80, 0)");
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, BARK_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Ground impact ellipse ripple
    if (bp < 0.7) {
      const gp = bp / 0.7;
      ctx.globalAlpha = (1 - gp) * 0.25;
      ctx.strokeStyle = "rgba(255, 220, 80, 0.8)";
      ctx.lineWidth = 2 * (1 - gp);
      ctx.beginPath();
      ctx.ellipse(0, 28 + (f - 1) * 8, 30 + gp * 140, 8 + gp * 25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 3. Triple expanding shockwave arcs with glow
    ctx.save();
    ctx.shadowColor = "rgba(255, 216, 72, 0.5)";
    for (let ring = 0; ring < 3; ring++) {
      const delay = ring * 0.12;
      const rp = Math.max(0, (bp - delay) / (1 - delay));
      if (rp <= 0 || rp >= 1) continue;
      const ringR = 25 + rp * BARK_RADIUS * (0.6 + ring * 0.2);
      ctx.globalAlpha = (1 - rp) * (0.45 - ring * 0.12);
      ctx.shadowBlur = ring === 0 ? 12 : 6;
      ctx.strokeStyle = ring === 0 ? "#fff" : "#f0d848";
      ctx.lineWidth = (5 - ring) * (1 - rp * 0.3);
      ctx.beginPath();
      ctx.arc(mouthX, mouthY, ringR, -0.8, 0.8);
      ctx.stroke();
    }
    ctx.restore();

    // 4. Speed lines radiating from mouth
    if (bp < 0.55) {
      const sp = bp / 0.55;
      const numLines = 9;
      ctx.lineCap = "round";
      for (let i = 0; i < numLines; i++) {
        const angle = -0.65 + (1.3 * i / (numLines - 1));
        const startR = 35 + sp * 70;
        const endR = startR + 10 + sp * 55;
        ctx.globalAlpha = (1 - sp * sp) * (i % 2 === 0 ? 0.6 : 0.35);
        ctx.strokeStyle = i % 2 === 0 ? "#fff" : "#f0d848";
        ctx.lineWidth = i % 2 === 0 ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(mouthX + Math.cos(angle) * startR, mouthY + Math.sin(angle) * startR);
        ctx.lineTo(mouthX + Math.cos(angle) * endR, mouthY + Math.sin(angle) * endR);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 5. Comic starburst "WOOF!"
    if (bp < 0.7) {
      const tp = bp / 0.7;
      const scale = 0.6 + tp * 0.4;
      const textX = mouthX + 45 * scale + tp * 20;
      const textY = mouthY - 25 - tp * 12;

      ctx.globalAlpha = 1 - tp * tp;

      // Jagged starburst shape behind text
      const burstR = 30 * scale;
      const spikes = 10;
      ctx.fillStyle = "#ffe040";
      ctx.strokeStyle = "#d4a800";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? burstR : burstR * 0.55;
        if (i === 0) ctx.moveTo(textX + Math.cos(a) * r, textY + Math.sin(a) * r);
        else ctx.lineTo(textX + Math.cos(a) * r, textY + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bold text with double outline (comic style)
      const fontSize = (22 + tp * 14) * scale;
      ctx.font = `900 ${fontSize}px ${CARTOON}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";

      ctx.strokeStyle = "#7a1818";
      ctx.lineWidth = 5;
      ctx.strokeText("WOOF!", textX, textY);

      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeText("WOOF!", textX, textY);

      ctx.fillStyle = "#d44040";
      ctx.fillText("WOOF!", textX, textY);

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    }

    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawPointPopups(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.pointPopups) {
    const t = p.age / p.lifetime; // 0→1
    const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8; // fade in then out
    const scale = t < 0.15 ? 0.5 + (t / 0.15) * 0.5 : 1; // pop-in

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, alpha);

    const text = `+${p.amount}`;
    const fontSize = 22 + Math.min(p.amount, 40) * 0.8;
    ctx.font = `bold ${fontSize}px ${CARTOON}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Outline
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeText(text, 0, 0);

    // Fill color based on score tier
    ctx.fillStyle =
      p.amount >= 1000 ? "#8b0000" :  // dark red
      p.amount >= 500  ? "#dc2626" :  // red
      p.amount >= 300  ? "#f97316" :  // orange
                         "#ffe040";   // yellow
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

export function drawCounter(ctx: CanvasRenderingContext2D, state: GameState) {
  const cx = state.stageW / 2;
  const display = `Score: ${state.dog.score}`;

  ctx.font = `bold 14px ${CARTOON}`;
  const tw = ctx.measureText(display).width + 30;
  const panelW = Math.max(tw, 180);
  const panelH = 30;
  const px = cx - panelW / 2;
  const py = 8;

  // Stardew Valley wooden frame
  ctx.fillStyle = "#f5e6c8";
  ctx.strokeStyle = "#6b4f32";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 5);
  ctx.fill();
  ctx.stroke();

  // Inner highlight
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px + 2, py + 2, panelW - 4, panelH - 4, 3);
  ctx.stroke();

  ctx.fillStyle = "#4a3520";
  ctx.font = `bold 14px ${CARTOON}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(display, cx, py + panelH / 2);
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

export function drawCursor(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.mouseInStage) return;

  const x = state.mouseX;
  const y = state.mouseY;

  ctx.save();
  ctx.translate(x, y);

  // White arrow cursor
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(4, 14);
  ctx.lineTo(8, 22);
  ctx.lineTo(11, 21);
  ctx.lineTo(7, 13);
  ctx.lineTo(12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// ── Scoop animation (post-game poop cleanup) ─────────────────────

export function drawScoopAnims(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const anim of state.scoopAnims) {
    drawScoopAnim(ctx, anim);
  }
}

function drawScoopAnim(
  ctx: CanvasRenderingContext2D,
  anim: { x: number; y: number; radius: number; progress: number },
) {
  const p = anim.progress;

  // Phase 1: Squash (0–0.15)
  if (p < 0.15) {
    const t = p / 0.15;
    ctx.save();
    ctx.translate(anim.x, anim.y);
    ctx.scale(1 + t * 0.15, 1 - t * 0.25);
    ctx.translate(-anim.x, -anim.y);
    drawPoop(ctx, anim.x, anim.y, anim.radius);
    ctx.restore();
  }
  // Phase 2: Lift + morph into bag (0.15–0.5)
  else if (p < 0.5) {
    const t = (p - 0.15) / 0.35;
    const liftY = -40 * t;

    // Fading poop
    if (t < 0.7) {
      ctx.save();
      ctx.globalAlpha = 1 - t / 0.7;
      drawPoop(ctx, anim.x, anim.y + liftY, anim.radius * (1 - t * 0.3));
      ctx.restore();
    }

    // Appearing bag
    const bagT = t * t;
    if (bagT > 0.1) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (bagT - 0.1) / 0.5);
      drawBag(ctx, anim.x, anim.y + liftY, anim.radius * 0.9, anim.radius * 1.2);
      ctx.restore();
    }
  }
  // Phase 3: Bag flies away (0.5–0.8)
  else if (p < 0.8) {
    const t = (p - 0.5) / 0.3;
    const arcX = 50 * t;
    const arcY = -40 - 50 * t * t;
    const scale = 1 - t * 0.8;

    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.translate(anim.x + arcX, anim.y + arcY);
    ctx.scale(scale, scale);
    drawBag(ctx, 0, 0, anim.radius * 0.9, anim.radius * 1.2);
    ctx.restore();
  }

  // Phase 4: Sparkle poof (0.6–1.0)
  if (p > 0.6) {
    const t = (p - 0.6) / 0.4;
    const spread = 10 + t * 30;

    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.7;

    const angles = [0, 1.257, 2.513, 3.77, 5.027];
    const colors = ["#ffd700", "#90ee90", "#ffd700", "#fff", "#90ee90"];

    for (let i = 0; i < 5; i++) {
      const sx = anim.x + Math.cos(angles[i] + t * 2) * spread;
      const sy = anim.y + Math.sin(angles[i] + t * 2) * spread;
      const size = (1 - t) * 3.5;
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

function drawBag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  // Bag body
  ctx.fillStyle = "#8B7355";
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2 + 4, w, h - 4, [0, 0, w * 0.25, w * 0.25]);
  ctx.fill();

  ctx.strokeStyle = "#5a4a35";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tied top
  ctx.fillStyle = "#7a6345";
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y - h / 2 + 4);
  ctx.quadraticCurveTo(x - w * 0.15, y - h / 2 - 4, x, y - h / 2);
  ctx.quadraticCurveTo(x + w * 0.15, y - h / 2 - 4, x + w * 0.35, y - h / 2 + 4);
  ctx.fill();

  // Knot
  ctx.fillStyle = "#6b5338";
  ctx.beginPath();
  ctx.ellipse(x, y - h / 2 - 1, 3, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ── Poop hover highlight (post-game) ──────────────────────────────

export function drawPoopHighlight(ctx: CanvasRenderingContext2D, state: GameState) {
  if (!state.mouseInStage) return;

  for (const o of state.obstacles) {
    const dist = Math.hypot(state.mouseX - o.x, state.mouseY - o.y);
    if (dist < o.radius + 25) {
      const pulse = 0.5 + Math.sin(performance.now() / 300) * 0.2;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius + 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
      break;
    }
  }
}

// ── "Click to clean up" hint (post-game) ──────────────────────────

export function drawScoopHint(ctx: CanvasRenderingContext2D, state: GameState) {
  if (state.obstacles.length === 0) return;

  const cx = (state.stageW - 360) / 2; // offset for sidebar
  const cy = state.stageH - 70;

  const pulse = 0.6 + Math.sin(performance.now() / 500) * 0.15;

  ctx.save();
  ctx.globalAlpha = pulse;

  ctx.fillStyle = "rgba(60, 40, 20, 0.8)";
  ctx.beginPath();
  ctx.roundRect(cx - 85, cy - 16, 170, 32, 16);
  ctx.fill();

  ctx.strokeStyle = "#5a4020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(cx - 85, cy - 16, 170, 32, 16);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = `bold 14px ${CARTOON}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("stoop and scoop", cx, cy);

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

export function drawTimer(ctx: CanvasRenderingContext2D, state: GameState) {
  const elapsed = performance.now() - state.roundStartTime;
  const remaining = Math.max(0, ROUND_DURATION - elapsed);
  const secs = (remaining / 1000).toFixed(1);

  const px = state.stageW / 2;
  const py = 56;

  // Pulsing urgency when low
  const urgent = remaining < 5000;
  const pulse = urgent ? 1 + Math.sin(performance.now() / 100) * 0.15 : 1;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(pulse, pulse);

  ctx.fillStyle = urgent ? "rgba(199, 80, 80, 0.85)" : "rgba(60, 40, 20, 0.7)";
  ctx.beginPath();
  ctx.roundRect(-40, -16, 80, 32, 16);
  ctx.fill();

  ctx.strokeStyle = urgent ? "#e84040" : "#5a4020";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-40, -16, 80, 32, 16);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = `bold 18px ${CARTOON}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${secs}s`, 0, 1);

  ctx.restore();
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}
