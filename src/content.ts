import type { TextRegion, RegionState } from "./types";
import { SERIF, getFenceBounds } from "./constants";
import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

type Section = {
  text: string;
  font: string;
  lineHeight: number;
  maxWidth: number;
};

function layoutSection(s: Section) {
  const p = prepareWithSegments(s.text, s.font);
  return layoutWithLines(p, s.maxWidth, s.lineHeight);
}

/** Truncate text to fit `maxLines`, appending "\u2026" */
function truncateToLines(s: Section, maxLines: number): string {
  const result = layoutSection(s);
  if (result.lines.length <= maxLines) return s.text;
  const kept = result.lines.slice(0, maxLines);
  // Reconstruct text from kept lines, trim trailing, add ellipsis
  let text = kept.map((l: { text: string }) => l.text).join(" ").replace(/\s+$/, "");
  // Remove trailing punctuation before ellipsis for cleaner look
  text = text.replace(/[,;:\s]+$/, "");
  return text + "\u2026";
}

export function buildRegions(stageW: number, stageH: number): RegionState[] {
  const m = stageW < 800;
  const fence = getFenceBounds(stageW, stageH);
  const fp = 15;
  const lx = fence.left + fp;
  const fenceInnerW = fence.right - fence.left - 2 * fp;
  const lw = m ? fenceInnerW : Math.min(520, fenceInnerW * 0.55);
  const rx = m ? lx : Math.max(lx + lw + 20, fence.left + fenceInnerW * 0.48);
  const rw = m ? fenceInnerW : Math.min(360, fence.right - fp - rx);
  const f = (b: number) => (m ? Math.round(b * 0.8) : b);
  const ty = fence.top + fp;
  const closingLH = f(26);
  const closingReserve = closingLH + f(10);
  const maxY = fence.bottom - fp - closingReserve;
  const gap = f(6); // tight gaps to maximize content

  const bodyFont = `${f(15)}px ${SERIF}`;
  const bodyLH = f(24);

  // All left-column sections in order
  const leftSections: Section[] = [
    { text: "Agency is Eating the Word*", font: `italic bold ${f(36)}px ${SERIF}`, lineHeight: f(44), maxWidth: Math.min(900, fenceInnerW) },
    { text: "In 2023, Sam Altman famously said, \"There'll soon be a 1-person billion-dollar company.\" Two years later, we're watching his prediction unfold \u2014 not simply because of AI, but because of the kind of individuals who are wielding it.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "A new breed of companies is emerging: lean, unconventional, and wildly successful. They generate hundreds of millions of dollars and yet have no sales teams, no marketing departments, no formal HR, not even vertically specialized engineers. They're led by a handful of people doing the work of hundreds, leveraging machines to scale their impact.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "For years, we feared automation would replace humans. But as AI reshapes the economy, it's becoming clear that far from replacing human ingenuity, AI has amplified it. The critical dividing line in our economy is no longer simply education or specialization, but rather agency itself: the raw determination to make things happen without waiting for permission.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "True agency is an unruly psychological trait. It's the willingness to act without explicit validation, instruction, or even permission. It's the meme \"you can just do things,\" knowing that \"you can poke life, and something will pop out the other side.\" It's a venture capitalist with no academic background founding the most important AI lab in history; a gaming entrepreneur creating a $30 billion military company; a fintech CEO birthing the private space industry out of thin air. True agency involves defiance, improvisation, instinct, and often irrationality.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "While driven individuals capable of making things happen have always existed, their bandwidth has historically been limited. It's impossible to scale impact entirely alone. You might want to \"just do things,\" but that doesn't mean you have enough physical time to learn everything yourself. High-agency people aiming to achieve their goals still need to hire specialists or spend years selecting and mastering a discipline.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "Specialization is a necessary precondition for success, making it a form of local monopoly. Even the most intelligent and driven people can't possibly perform every job simultaneously. The optimal strategy is typically to follow the lead, stay in your lane, do your homework, and achieve top marks. We don't live in a world that's kind to generalists. Well, until AI, that is.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "We're now facing a rupture, a phase transition. AI has eroded the value of specialization because, for many tasks, achieving the outcome of several years of experience now takes a $20 ChatGPT subscription. If a decade ago it took me nine months to gain enough experience to ship a single prototype, now it takes just one week to build a state-of-the-art platform ready to be shipped \u2014 a project once only achievable by a full team of professionals.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "The game has shifted, and the winning strategy with it. It's no longer about understanding specialized details; it's about grasping the high-level global picture. It's less about knowing how to patch a system and more about knowing that it needs to be patched. It's more about architecture, and less about implementation. Precisely where generalists thrive.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "For these individuals, boundaries between professions are beginning to blur and overlap. I've begun to see product managers developing business financial models; designers writing commercial ads; barbershops building custom booking systems; and restaurant owners creating advanced pricing tools. Even domains seemingly far from tech, like agriculture, are beginning to see this impact, with farmers building crop tracking systems. These people always had it in them to do these things. The key difference is that it no longer takes years to learn how.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "If you extend this argument to the limit, you end up with individuals running entire companies by themselves. The share of solo-founder startups has almost doubled in the last few years. Companies like Midjourney, with its 40 employees and $500m of yearly revenues, represent a structural shift, not an anomaly. These companies are now full of high-agency individuals carrying the work of several teams, and are easily competing with much larger companies. This is the unraveling of credentialism.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "My entire world model has collapsed into a single bit: agency, or no agency. The transition will take time, and it will be far from painless. Institutions built around credentials won't go gently into the good night. Middle management will fight to keep headcount because it will take time to shift away from the idea that more people working on a problem signals a more important problem.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "Structure isn't always bad. One-person companies come with high chaos potential, and cascading errors can be hard to contain at scale. A solo operator lacks the redundancy of a team \u2014 when the AI fumbles, there's no safety net. Yet, these entrepreneurs will still prove to be mighty competitive forces that big firms can't ignore.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
    { text: "The good news is that having high agency is an internal state of mind, and it can be absorbed. It means freeing oneself from artificial constraints and defying them. It's Morpheus challenging Neo in The Matrix: \"Do you think that's air you're breathing now?\" The limitations we've accepted as natural \u2014 degrees, credentials, specialized skills, years of experience \u2014 are no longer the barriers we believed they were to making things happen.", font: bodyFont, lineHeight: bodyLH, maxWidth: lw },
  ];

  // Right-column sections (desktop only)
  const rightSections: Section[] = [
    { text: "\"My entire world model has collapsed into a single bit: agency, or no agency.\"", font: `italic ${f(18)}px ${SERIF}`, lineHeight: f(28), maxWidth: rw },
    { text: "Agency", font: `bold ${f(22)}px ${SERIF}`, lineHeight: f(30), maxWidth: rw },
    { text: "Despite its status as standard industry nomenclature, I've grown to dislike the term \"agent.\" When building agents, we're giving programs everything except agency. The most successful AI products today are reactive, not proactive, and don't exhibit genuine independence, primarily because that's what customers want: programs that listen when told what to do. High-agency people don't.", font: `${f(14)}px ${SERIF}`, lineHeight: f(22), maxWidth: rw },
    { text: "A Phase Shift", font: `bold ${f(22)}px ${SERIF}`, lineHeight: f(30), maxWidth: rw },
    { text: "Skeptics will push back against this techno-optimism, arguing that AI is sloppy, intrinsically probabilistic and prone to mistakes. While it's true that specialization hasn't become irrelevant, it no longer matters indiscriminately and uniformly anymore. In industries where untrained people equipped with imperfect AI models could make costly mistakes, we are going to see demand for specialized human accountability. However, for most jobs this is not true. Wherever we are ok with \"trying again\" after getting a bad AI generation, we will see market disruption.", font: `${f(14)}px ${SERIF}`, lineHeight: f(22), maxWidth: rw },
    { text: "A New World", font: `bold ${f(22)}px ${SERIF}`, lineHeight: f(30), maxWidth: rw },
    { text: "Having an edge in the market is no longer about knowing how to do something very specific very well; it's about being biased toward making it happen. Three years ago AI could simply auto-complete small code snippets. Two years ago it started fixing broken programs. Last year it began creating new projects from scratch. It now can autonomously understand large projects created by thousands of human developers, and be used even by non-professionals.", font: `${f(14)}px ${SERIF}`, lineHeight: f(22), maxWidth: rw },
    { text: "Henri Shi, who spent nearly a decade growing super.com into a $150M ARR business, is now tracking the progress towards Altman's one-person billion dollar company goal in a public leaderboard. He reports an average of $2.8 million in revenue per employee, coincidentally the same as Apple, the most valuable publicly traded US company of the past two decades.", font: `${f(14)}px ${SERIF}`, lineHeight: f(22), maxWidth: rw },
  ];

  const regions: TextRegion[] = [];

  // Lay out a column: fill space, truncating the last section if partial fit
  function fillColumn(sections: Section[], x: number) {
    let curY = ty;
    for (const s of sections) {
      const remaining = maxY - curY;
      if (remaining < s.lineHeight) break; // can't even fit one line

      const result = layoutSection(s);
      const fullH = result.lines.length * s.lineHeight;

      if (curY + fullH <= maxY) {
        // Full section fits
        regions.push({ text: s.text, x, y: curY, maxWidth: s.maxWidth, font: s.font, lineHeight: s.lineHeight });
        curY += fullH + gap;
      } else {
        // Partial fit — truncate to however many lines we can show
        const fittableLines = Math.floor(remaining / s.lineHeight);
        if (fittableLines >= 1) {
          const truncated = truncateToLines(s, fittableLines);
          regions.push({ text: truncated, x, y: curY, maxWidth: s.maxWidth, font: s.font, lineHeight: s.lineHeight });
        }
        break; // no more space after a truncated section
      }
    }
  }

  fillColumn(leftSections, lx);
  if (!m) fillColumn(rightSections, rx);

  // Bottom closing line
  regions.push({
    text: "Like Neo, the hardest part is simply believing we're free to jump.",
    x: lx,
    y: fence.bottom - fp - closingLH,
    maxWidth: Math.min(Math.round(stageW * 0.64), fenceInnerW),
    font: `italic ${f(17)}px ${SERIF}`,
    lineHeight: closingLH,
  });

  const states: RegionState[] = [];
  for (const r of regions) {
    const wt = r.text.split(/\s+/).filter((w) => w.length > 0);
    states.push({ region: r, originalTexts: [...wt], wordTexts: [...wt] });
  }
  return states;
}
