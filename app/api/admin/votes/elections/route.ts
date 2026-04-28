import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { listElections, saveElection, getVotes, getVoterCount } from "@/lib/votes-store";
import type { Election } from "@/lib/votes-types";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const elections = listElections();
  const result = elections.map((e) => ({
    ...e,
    votes: getVotes(e.id),
    voterCount: getVoterCount(e.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Partial<Election> | null;

  if (!body?.title || !body?.candidates || body.candidates.length < 2) {
    return NextResponse.json(
      { error: "Title and at least 2 candidates are required" },
      { status: 400 },
    );
  }

  const election: Election = {
    id: crypto.randomUUID(),
    title: body.title.trim(),
    description: body.description?.trim() || undefined,
    candidates: body.candidates.map((c) => ({
      id: crypto.randomUUID(),
      name: c.name.trim(),
      description: c.description?.trim() || undefined,
      emoji: c.emoji || "👤",
    })),
    isOpen: false,
    createdAt: new Date().toISOString(),
  };

  saveElection(election);
  return NextResponse.json(election, { status: 201 });
}
