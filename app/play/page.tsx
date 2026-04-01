"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GameInner() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "Anonymous";

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const started = useRef(false);

  type ScoreEntry = { id: number; username: string; score: number };

  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [playerEntryId, setPlayerEntryId] = useState<number | null>(null);

  const onRoundEnd = useCallback((score: number) => {
    setFinalScore(score);
    setGameOver(true);

    // Submit score, then fetch leaderboard
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score }),
    })
      .then(() => fetch("/api/scores"))
      .then((r) => r.json())
      .then((scores: ScoreEntry[]) => {
        setLeaderboard(scores);
        // Find the player's entry to highlight it
        const entry = scores.find(
          (s) => s.username === username && s.score === score,
        );
        if (entry) setPlayerEntryId(entry.id);
        setSubmitted(true);
      })
      .catch(() => setSubmitted(true)); // show buttons even if submit fails
  }, [username]);

  useEffect(() => {
    if (started.current) return;
    if (!stageRef.current || !canvasRef.current || !textLayerRef.current) return;
    started.current = true;

    import("../../src/main").then((mod) => {
      cleanupRef.current = mod.boot(
        canvasRef.current!,
        textLayerRef.current!,
        stageRef.current!,
        { onRoundEnd },
      );
    });

    return () => {
      cleanupRef.current?.();
    };
  }, [onRoundEnd]);

  function playAgain() {
    cleanupRef.current?.();
    started.current = false;
    setGameOver(false);
    setFinalScore(0);
    setSubmitted(false);
    setLeaderboard([]);
    setPlayerEntryId(null);

    // Small delay so React re-renders the cleared state
    requestAnimationFrame(() => {
      if (!stageRef.current || !canvasRef.current || !textLayerRef.current) return;
      // Clear the text layer
      const tl = textLayerRef.current;
      while (tl.firstChild) tl.removeChild(tl.firstChild);

      started.current = true;
      import("../../src/main").then((mod) => {
        cleanupRef.current = mod.boot(
          canvasRef.current!,
          textLayerRef.current!,
          stageRef.current!,
          { onRoundEnd },
        );
      });
    });
  }

  return (
    <>
      <main className="stage" ref={stageRef}>
        <canvas className="stage-canvas" ref={canvasRef} />
        <div className="text-layer" ref={textLayerRef} />
      </main>

      {!gameOver && (
        <button className="restart-btn" onClick={playAgain}>
          Restart
        </button>
      )}

      <div className="hud">
        Move fast to eat words! &nbsp;&bull;&nbsp; Left-click: bark
        &nbsp;&bull;&nbsp; Right-click: poop (resets size)
      </div>

      <div className="credit-bar">
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

      {gameOver && submitted && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>Time&apos;s Up!</h2>
            <div className="game-over-score">{finalScore}</div>
            <div className="game-over-label">characters eaten</div>

            {leaderboard.length > 0 && (
              <div className="game-over-leaderboard">
                <h3>Leaderboard</h3>
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 10).map((s, i) => (
                      <tr
                        key={s.id}
                        className={s.id === playerEntryId ? "highlight-row" : ""}
                      >
                        <td>{i + 1}</td>
                        <td>{s.username}</td>
                        <td>{s.score} chars</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <button onClick={playAgain}>Play Again</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <GameInner />
    </Suspense>
  );
}
