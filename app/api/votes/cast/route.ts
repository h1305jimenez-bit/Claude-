import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import { getElection, castVote } from "@/lib/votes-store";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    electionId?: string;
    candidateId?: string;
  } | null;

  if (!body?.electionId || !body?.candidateId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const election = getElection(body.electionId);
  if (!election) return NextResponse.json({ error: "Election not found" }, { status: 404 });
  if (!election.isOpen) return NextResponse.json({ error: "Election is closed" }, { status: 400 });

  const candidate = election.candidates.find((c) => c.id === body.candidateId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const ok = castVote(body.electionId, body.candidateId, session.email);
  if (!ok) return NextResponse.json({ error: "You have already voted" }, { status: 409 });

  return NextResponse.json({ ok: true });
}
