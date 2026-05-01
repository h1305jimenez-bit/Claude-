import { cookies } from "next/headers";
import { AUTH_COOKIES, verifySessionToken } from "@/lib/auth";
import { POSITIONS, getResults, getVotesByEmail } from "@/lib/election-store";
import { ElectionClient } from "./ElectionClient";

export default async function ElectionPage() {
  const token = cookies().get(AUTH_COOKIES.session)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const results = getResults();
  const myVotes = session ? getVotesByEmail(session.email) : {};

  return (
    <div className="space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-3xl bg-hec-navy p-6 text-white shadow-card">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-hec-gold/20 blur-3xl"
        />
        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-[0.15em] text-hec-gold">
            HEC Paris · MBA 2026
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight">
            Class Elections 🗳️
          </h1>
          <p className="mt-1 text-sm text-white/80">
            Vote for your class representatives. One vote per position. Results
            update live.
          </p>
        </div>
      </section>

      <ElectionClient
        positions={POSITIONS}
        initialResults={results}
        initialMyVotes={myVotes}
        email={session?.email ?? null}
      />
    </div>
  );
}
