import { neon } from "@neondatabase/serverless";

export type Score = {
  id: number;
  user_id: string;
  username: string;
  score: number;
  created_at: string;
};

// ── In-memory fallback (used when DATABASE_URL is not set) ──────────

let memoryScores: Score[] = [];
let memoryNextId = 1;

function useNeon() {
  return !!process.env.DATABASE_URL;
}

function sql() {
  return neon(process.env.DATABASE_URL!);
}

// ── Neon implementation ─────────────────────────────────────────────

async function pgEnsureTable() {
  const query = sql();
  await query`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      score INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}

async function pgInsertScore(userId: string, username: string, score: number) {
  const query = sql();
  await pgEnsureTable();
  await query`INSERT INTO scores (user_id, username, score) VALUES (${userId}, ${username}, ${score})`;
}

async function pgGetLeaderboard(limit: number): Promise<Score[]> {
  const query = sql();
  await pgEnsureTable();
  const rows = await query`
    SELECT id, user_id, username, score, created_at
    FROM scores
    ORDER BY score DESC
    LIMIT ${limit}
  `;
  return rows as Score[];
}

async function pgIsUsernameTaken(username: string, userId: string): Promise<boolean> {
  const query = sql();
  await pgEnsureTable();
  const rows = await query`
    SELECT 1 FROM scores
    WHERE LOWER(username) = LOWER(${username}) AND user_id != ${userId}
    LIMIT 1
  `;
  return rows.length > 0;
}

// ── Public API (auto-selects backend) ──────────────────────────────

export async function insertScore(userId: string, username: string, score: number) {
  if (useNeon()) {
    return pgInsertScore(userId, username, score);
  }
  memoryScores.push({
    id: memoryNextId++,
    user_id: userId,
    username,
    score,
    created_at: new Date().toISOString(),
  });
}

export async function getLeaderboard(limit = 20): Promise<Score[]> {
  if (useNeon()) {
    return pgGetLeaderboard(limit);
  }
  return [...memoryScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function isUsernameTaken(username: string, userId: string): Promise<boolean> {
  if (useNeon()) {
    return pgIsUsernameTaken(username, userId);
  }
  return memoryScores.some(
    (s) => s.username.toLowerCase() === username.toLowerCase() && s.user_id !== userId,
  );
}
