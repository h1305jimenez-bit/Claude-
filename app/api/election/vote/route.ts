import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import { castVote, getResults, getVotesByEmail } from "@/lib/election-store";

export async function POST(req: NextRequest) {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { positionId, candidateId } = body ?? {};
  if (!positionId || !candidateId) {
    return NextResponse.json({ error: "Missing positionId or candidateId" }, { status: 400 });
  }

  const result = castVote(positionId, candidateId, session.email);
  if (result === "invalid") {
    return NextResponse.json({ error: "Invalid position or candidate" }, { status: 400 });
  }
  if (result === "already_voted") {
    return NextResponse.json({ error: "Already voted for this position" }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    results: getResults(),
    myVotes: getVotesByEmail(session.email),
  });
}

export async function GET() {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    results: getResults(),
    myVotes: getVotesByEmail(session.email),
  });
}
