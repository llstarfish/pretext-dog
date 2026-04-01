"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ScoreEntry = {
  id: number;
  username: string;
  score: number;
  created_at: string;
};

export default function StartPage() {
  const [username, setUsername] = useState("");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Restore last username
    const saved = localStorage.getItem("pretext-dog-username");
    if (saved) setUsername(saved);

    // Fetch leaderboard
    fetch("/api/scores")
      .then((r) => r.json())
      .then(setScores)
      .catch(() => {});
  }, []);

  function play() {
    const name = username.trim();
    if (!name) return;
    localStorage.setItem("pretext-dog-username", name);
    router.push(`/play?username=${encodeURIComponent(name)}`);
  }

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1>Hungry Hungry Doggo</h1>
        <p>Eat as many words as you can in 15 seconds!</p>
        <input
          type="text"
          placeholder="Enter your name..."
          maxLength={30}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && play()}
          autoFocus
        />
        <button onClick={play} disabled={!username.trim()}>
          Play
        </button>
      </div>

      <div className="leaderboard-card">
        <h2>Leaderboard</h2>
        {scores.length === 0 ? (
          <div className="leaderboard-empty">
            No scores yet. Be the first!
          </div>
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
              {scores.slice(0, 10).map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.username}</td>
                  <td>{s.score} chars</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
    </div>
  );
}
