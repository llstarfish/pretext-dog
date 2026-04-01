import { NextRequest, NextResponse } from "next/server";
import { insertScore, getLeaderboard, isUsernameTaken } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      200,
      Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 20),
    );
    const scores = await getLeaderboard(limit);
    return NextResponse.json(scores);
  } catch (e) {
    // If DB is not configured yet, return empty leaderboard
    console.error("Leaderboard fetch failed:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, username, score } = await req.json();

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }
    if (!username || typeof username !== "string" || username.length > 30) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }
    if (typeof score !== "number" || score < 0 || !Number.isInteger(score)) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    const taken = await isUsernameTaken(username.trim(), userId);
    if (taken) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    await insertScore(userId, username.trim(), score);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Score submission failed:", e);
    return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
  }
}
