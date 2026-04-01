import {
  prepareWithSegments,
  layoutWithLines,
} from "@chenglou/pretext";
import type { Word, DomRefs } from "./types";
import { PALETTE, WIDTH_CACHE_MAX } from "./constants";
import type { GameState } from "./state";

export function layoutAll(state: GameState, refs: DomRefs) {
  for (const w of state.words) w.el.remove();
  state.words.length = 0;
  state.nextId = 0;
  for (let ri = 0; ri < state.regionStates.length; ri++) {
    layoutRegion(state, refs, ri, false);
  }
}

export function layoutRegion(
  state: GameState,
  refs: DomRefs,
  ri: number,
  preserveMotion: boolean,
) {
  const rs = state.regionStates[ri];
  const region = rs.region;

  const oldMotion = new Map<
    number,
    { x: number; y: number; vx: number; vy: number; scared: boolean; scaredAt: number }
  >();
  if (preserveMotion) {
    for (const w of state.words) {
      if (w.regionIndex === ri && w.alive) {
        oldMotion.set(w.slotIndex, {
          x: w.x, y: w.y, vx: w.vx, vy: w.vy, scared: w.scared, scaredAt: w.scaredAt,
        });
      }
    }
  }

  for (let i = state.words.length - 1; i >= 0; i--) {
    if (state.words[i].regionIndex === ri && state.words[i].alive) {
      state.words[i].el.remove();
      state.words.splice(i, 1);
    }
  }

  const remaining: { text: string; slotIndex: number }[] = [];
  for (let i = 0; i < rs.wordTexts.length; i++) {
    if (rs.wordTexts[i] !== null) {
      remaining.push({ text: rs.wordTexts[i]!, slotIndex: i });
    }
  }
  if (remaining.length === 0) return;

  const text = remaining.map((r) => r.text).join(" ");
  const prepared = prepareWithSegments(text, region.font);
  const result = layoutWithLines(prepared, region.maxWidth, region.lineHeight);

  const frag = document.createDocumentFragment();
  let wi = 0;

  for (let li = 0; li < result.lines.length; li++) {
    const line = result.lines[li];
    const lineY = region.y + li * region.lineHeight;
    const segs = line.text.match(/\S+|\s+/g) ?? [];
    let cx = region.x;

    for (const seg of segs) {
      const sw = measureWord(state, seg, region.font, region.lineHeight);
      if (seg.trim().length > 0 && wi < remaining.length) {
        const r = remaining[wi];
        const old = oldMotion.get(r.slotIndex);
        const color = PALETTE[(ri * 5 + r.slotIndex) % PALETTE.length];

        const el = document.createElement("div");
        el.className = "word";
        el.textContent = seg;
        el.style.font = region.font;
        el.style.lineHeight = `${region.lineHeight}px`;
        el.style.color = color;
        el.style.left = `${cx}px`;
        el.style.top = `${lineY}px`;
        frag.appendChild(el);

        const word: Word = {
          id: state.nextId++,
          text: seg,
          el,
          regionIndex: ri,
          slotIndex: r.slotIndex,
          homeX: cx,
          homeY: lineY,
          x: old ? old.x : cx,
          y: old ? old.y : lineY,
          vx: old ? old.vx : 0,
          vy: old ? old.vy : 0,
          width: sw,
          height: region.lineHeight,
          alive: true,
          color,
          scared: old ? old.scared : false,
          scaredAt: old ? old.scaredAt : 0,
        };
        if (old) {
          el.style.transform = `translate(${old.x - cx}px, ${old.y - lineY}px)`;
        }
        state.words.push(word);
        wi++;
      }
      cx += sw;
    }
  }
  refs.textLayer.appendChild(frag);
}

function measureWord(
  state: GameState,
  text: string,
  font: string,
  lh: number,
): number {
  const k = `${font}__${text}`;
  const c = state.widthCache.get(k);
  if (c !== undefined) return c;

  // Prevent unbounded cache growth
  if (state.widthCache.size > WIDTH_CACHE_MAX) state.widthCache.clear();

  const p = prepareWithSegments(text, font, { whiteSpace: "pre-wrap" });
  const { lines } = layoutWithLines(p, 100000, lh);
  const w = lines[0]?.width ?? 0;
  state.widthCache.set(k, w);
  return w;
}

export function processReflows(state: GameState, refs: DomRefs) {
  for (const ri of state.reflowQueued) layoutRegion(state, refs, ri, true);
  state.reflowQueued.clear();
}
