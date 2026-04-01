import { NextRequest, NextResponse } from "next/server";
import { insertScore, getLeaderboard } from "@/lib/db";

export async function GET() {
  try {
    const scores = await getLeaderboard();
    return NextResponse.json(scores);
  } catch (e) {
    // If DB is not configured yet, return empty leaderboard
    console.error("Leaderboard fetch failed:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { username, score } = await req.json();

    if (!username || typeof username !== "string" || username.length > 30) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    if (typeof score !== "number" || score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    await insertScore(username.trim(), score);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Score submission failed:", e);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
