import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import { listElections, getVotes, hasVoted } from "@/lib/votes-store";

export const runtime = "nodejs";

export async function GET() {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const elections = listElections();
  const result = elections.map((e) => ({
    ...e,
    hasVoted: hasVoted(e.id, session.email),
    // Only expose vote counts once the election is closed
    votes: e.isOpen ? undefined : getVotes(e.id),
  }));

  return NextResponse.json(result);
}
