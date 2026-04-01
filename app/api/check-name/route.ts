import { NextRequest, NextResponse } from "next/server";
import { isUsernameTaken } from "@/lib/db";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!username || !userId) {
    return NextResponse.json({ error: "Missing username or userId" }, { status: 400 });
  }

  try {
    const taken = await isUsernameTaken(username.trim(), userId);
    return NextResponse.json({ available: !taken });
  } catch (e) {
    console.error("Name check failed:", e);
    return NextResponse.json({ available: true });
  }
}
