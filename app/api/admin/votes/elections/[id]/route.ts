import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { getElection, saveElection, deleteElection } from "@/lib/votes-store";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const election = getElection(params.id);
  if (!election) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { isOpen?: boolean } | null;
  const nowOpen = body?.isOpen ?? election.isOpen;

  const updated = {
    ...election,
    isOpen: nowOpen,
    closedAt:
      nowOpen === false && election.isOpen ? new Date().toISOString() : election.closedAt,
  };

  saveElection(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  deleteElection(params.id);
  return NextResponse.json({ ok: true });
}
