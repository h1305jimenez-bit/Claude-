import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get("x-access-token");
  if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [, rawPayload] = accessToken.split(".");
  if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
  const payload = JSON.parse(
    Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
  ) as { sub?: string };
  const userId = payload.sub;
  if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 401 });

  const userRes = await fetch(
    `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=cv_text,seniority&limit=1`,
    { headers: { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY } }
  );
  const userData = await userRes.json() as { cv_text?: string; seniority?: string }[];
  const user = userData[0];

  if (!user?.cv_text) {
    return NextResponse.json({ error: "Upload your CV first to get role suggestions." }, { status: 400 });
  }

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Based on this CV, suggest 6 specific job titles this person should search for on job boards like Adzuna or LinkedIn. Return ONLY a JSON array of strings — short, standard titles that recruiters actually use (e.g. "Investment Analyst", "M&A Associate", "Private Equity Analyst"). No descriptions, no numbering, just the array.

CV (excerpt):
${user.cv_text.slice(0, 2000)}`,
    }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return NextResponse.json({ error: "Could not parse suggestions" }, { status: 500 });

  const suggestions = JSON.parse(match[0]) as string[];
  return NextResponse.json({ suggestions: suggestions.slice(0, 6) });
}
