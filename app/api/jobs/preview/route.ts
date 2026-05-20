import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs } from "@/lib/adzuna";

export const maxDuration = 60;

type ExtractedPrefs = {
  name: string; target_role: string; target_location: string;
  seniority: string; education: string; phone: string; linkedin: string;
  salary_expectation: string; work_authorization: string;
};

async function extractFromCv(buffer: Buffer): Promise<{ prefs: ExtractedPrefs; cvText: string }> {
  const b64 = buffer.toString("base64");
  const [prefsMsg, textMsg] = await Promise.all([
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } } as never,
          { type: "text", text: `Extract from this CV. Return ONLY valid JSON with these exact keys (empty string if not found): name, target_role (most recent job title or role they seek), target_location (city or country from CV, empty if not found), seniority (Intern/Junior/Mid-level/Senior/Lead/Manager/Director/Executive), education (degree + institution), phone, linkedin, salary_expectation, work_authorization.` },
        ],
      }],
    }),
    anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } } as never,
          { type: "text", text: "Extract the full text content of this CV. Return plain text only, no commentary." },
        ],
      }],
    }),
  ]);

  const prefsRaw = prefsMsg.content[0].type === "text" ? prefsMsg.content[0].text : "{}";
  const match = prefsRaw.match(/\{[\s\S]*\}/);
  const prefs = match ? JSON.parse(match[0]) as ExtractedPrefs : {} as ExtractedPrefs;
  const cvText = textMsg.content[0].type === "text" ? textMsg.content[0].text : "";
  return { prefs, cvText };
}

export async function POST(req: NextRequest) {
  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer.byteLength) return NextResponse.json({ error: "No file" }, { status: 400 });
  const buffer = Buffer.from(arrayBuffer);

  try {
    const { prefs, cvText } = await extractFromCv(buffer);
    const role = prefs.target_role || "Software Engineer";

    // Always search worldwide (no location) — Adzuna fans out across US, UK, CA, AU, DE, SG
    const allJobs = await fetchAdzunaJobs(role, "");
    const totalCount = allJobs.length;
    const jobsToScore = allJobs.slice(0, 10);

    if (jobsToScore.length === 0) {
      return NextResponse.json({ prefs, jobs: [], totalCount: 0 });
    }

    const candidateContext = `Role: ${role}\nSeniority: ${prefs.seniority || "Not specified"}\nBackground: ${cvText.slice(0, 1200)}`;

    const prompt = `Score these ${jobsToScore.length} jobs for this candidate. Return ONLY a valid JSON array with exactly ${jobsToScore.length} objects.

CANDIDATE:
${candidateContext}

JOBS:
${jobsToScore.map((job, i) => `--- JOB ${i + 1} ---
Title: ${job.title}
Location: ${job.location?.display_name || ""}
Description: ${(job.description || "").slice(0, 400)}`).join("\n\n")}

Return JSON array (same order): [{"score":<0-100>,"rationale":"<1 sentence: key reason this matches or doesn't>"}]`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) as Array<{ score: number; rationale: string }> : [];

    const jobs = jobsToScore.map((job, i) => ({
      id: job.id,
      role: job.title,
      location: job.location?.display_name || "",
      score: scores[i]?.score ?? 50,
      rationale: scores[i]?.rationale ?? "",
    }));

    jobs.sort((a, b) => b.score - a.score);

    return NextResponse.json({ prefs, jobs, totalCount });
  } catch (e) {
    console.error("jobs/preview error:", e);
    return NextResponse.json({ error: (e as { message?: string }).message ?? "Preview failed" }, { status: 500 });
  }
}
