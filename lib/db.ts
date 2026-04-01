export type Score = {
  id: number;
  username: string;
  score: number;
  created_at: string;
};

// ── In-memory fallback (used when POSTGRES_URL is not set) ─────────

let memoryScores: Score[] = [];
let memoryNextId = 1;

function usePostgres() {
  return !!process.env.POSTGRES_URL;
}

// ── Postgres implementation ────────────────────────────────────────

async function pgEnsureTable() {
  const { sql } = await import("@vercel/postgres");
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      score INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}

async function pgInsertScore(username: string, score: number) {
  const { sql } = await import("@vercel/postgres");
  await pgEnsureTable();
  await sql`INSERT INTO scores (username, score) VALUES (${username}, ${score})`;
}

async function pgGetLeaderboard(limit: number): Promise<Score[]> {
  const { sql } = await import("@vercel/postgres");
  await pgEnsureTable();
  const { rows } = await sql`
    SELECT id, username, score, created_at
    FROM scores
    ORDER BY score DESC
    LIMIT ${limit}
  `;
  return rows as Score[];
}

// ── Public API (auto-selects backend) ──────────────────────────────

export async function insertScore(username: string, score: number) {
  if (usePostgres()) {
    return pgInsertScore(username, score);
  }
  memoryScores.push({
    id: memoryNextId++,
    username,
    score,
    created_at: new Date().toISOString(),
  });
}

export async function getLeaderboard(limit = 20): Promise<Score[]> {
  if (usePostgres()) {
    return pgGetLeaderboard(limit);
  }
  return [...memoryScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
