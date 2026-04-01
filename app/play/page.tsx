"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { GameHandle } from "../../src/main";

function GameInner() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username") || "Anonymous";

  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const started = useRef(false);

  type ScoreEntry = { id: number; username: string; score: number };

  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [playerEntryId, setPlayerEntryId] = useState<number | null>(null);
  const onRoundEnd = useCallback((score: number) => {
    setFinalScore(score);
    setGameOver(true);

    const userId = localStorage.getItem("pretext-dog-user-id") || "anonymous";

    // Submit score, then fetch leaderboard (large limit to find player rank)
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username, score }),
    })
      .then(() => fetch("/api/scores?limit=200"))
      .then((r) => r.json())
      .then((scores: ScoreEntry[]) => {
        setLeaderboard(scores);
        const entry = scores.find(
          (s) => s.username === username && s.score === score,
        );
        if (entry) setPlayerEntryId(entry.id);
        setSubmitted(true);
      })
      .catch(() => setSubmitted(true));
  }, [username]);

  useEffect(() => {
    if (started.current) return;
    if (!stageRef.current || !canvasRef.current || !textLayerRef.current) return;
    started.current = true;

    import("../../src/main").then((mod) => {
      handleRef.current = mod.boot(
        canvasRef.current!,
        textLayerRef.current!,
        stageRef.current!,
        { onRoundEnd },
      );
    });

    return () => {
      handleRef.current?.cleanup();
    };
  }, [onRoundEnd]);

  function viewLeaderboard() {
    setShowLeaderboard(true);
    handleRef.current?.enableScoop();
  }

  function playAgain() {
    handleRef.current?.cleanup();
    started.current = false;
    setGameOver(false);
    setFinalScore(0);
    setSubmitted(false);
    setShowLeaderboard(false);
    setLeaderboard([]);
    setPlayerEntryId(null);
    requestAnimationFrame(() => {
      if (!stageRef.current || !canvasRef.current || !textLayerRef.current) return;
      const tl = textLayerRef.current;
      while (tl.firstChild) tl.removeChild(tl.firstChild);

      started.current = true;
      import("../../src/main").then((mod) => {
        handleRef.current = mod.boot(
          canvasRef.current!,
          textLayerRef.current!,
          stageRef.current!,
          { onRoundEnd },
        );
      });
    });
  }

  const playerRank = leaderboard.findIndex((s) => s.id === playerEntryId);

  return (
    <>
      <main className="stage" ref={stageRef}>
        <canvas className="stage-canvas" ref={canvasRef} />
        <div className="text-layer" ref={textLayerRef} />
      </main>

      {!gameOver && (
        <>
          <button className="restart-btn" onClick={playAgain}>
            Restart
          </button>

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
        </>
      )}

      {/* Centered game-over modal (before viewing leaderboard) */}
      {gameOver && !showLeaderboard && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2>Time&apos;s Up!</h2>
            <div className="game-over-score">{finalScore}</div>
            <div className="game-over-label">score</div>
            {submitted && playerRank >= 0 && (
              <>
                <div className="game-over-rank">
                  #{playerRank + 1} of {leaderboard.length}
                </div>
                <div className="modal-nearby">
                  <table className="leaderboard-table">
                    <tbody>
                      {leaderboard
                        .map((s, i) => ({ ...s, rank: i }))
                        .filter(
                          (s) =>
                            s.rank >= Math.max(0, playerRank - 2) &&
                            s.rank <= Math.min(leaderboard.length - 1, playerRank + 2),
                        )
                        .map((s) => (
                          <tr
                            key={s.id}
                            className={s.id === playerEntryId ? "highlight-row" : ""}
                          >
                            <td>{s.rank + 1}</td>
                            <td>{s.username}</td>
                            <td>{s.score}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <div className="modal-actions">
              {submitted && (
                <button onClick={viewLeaderboard}>View Leaderboard</button>
              )}
              <button className="modal-btn-secondary" onClick={playAgain}>
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard sidebar (after user clicks View Leaderboard) */}
      {gameOver && showLeaderboard && submitted && (
        <div className="game-over-sidebar">
          <div className="sidebar-header">
            <h2>Leaderboard</h2>
            {playerRank >= 0 && (
              <div className="game-over-rank">
                You placed #{playerRank + 1} of {leaderboard.length}
              </div>
            )}
          </div>

          <div className="sidebar-leaderboard">
            {leaderboard.length === 0 ? (
              <div className="leaderboard-empty">No scores yet.</div>
            ) : (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((s, i) => (
                    <tr
                      key={s.id}
                      className={s.id === playerEntryId ? "highlight-row" : ""}
                    >
                      <td>{i + 1}</td>
                      <td>{s.username}</td>
                      <td>{s.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="sidebar-actions">
            <button onClick={playAgain}>Play Again</button>
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
