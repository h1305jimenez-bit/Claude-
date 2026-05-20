import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { fetchAdzunaJobs, SUPPORTED_LOCATIONS } from "@/lib/adzuna";

export const maxDuration = 60;

const ADZUNA_SUPPORTED = new Set(SUPPORTED_LOCATIONS.map(l => l.name.toLowerCase()));

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
    const location = prefs.target_location || "";

    // Fetch up to 15 jobs from Adzuna (or skip if unsupported)
    const locLower = location.toLowerCase();
    const isAdzunaSupported = !location || ADZUNA_SUPPORTED.has(locLower) ||
      [...ADZUNA_SUPPORTED].some(s => locLower.includes(s) || s.includes(locLower));

    let rawJobs = isAdzunaSupported ? await fetchAdzunaJobs(role, location) : [];
    if (rawJobs.length === 0 && location) rawJobs = await fetchAdzunaJobs(role, "");
    const jobsToScore = rawJobs.slice(0, 12);

    if (jobsToScore.length === 0) {
      return NextResponse.json({ prefs, jobs: [] });
    }

    const candidateContext = `Role: ${role}\nLocation: ${location || "Any"}\nSeniority: ${prefs.seniority || "Not specified"}\nBackground: ${cvText.slice(0, 1200)}`;

    const prompt = `Score these ${jobsToScore.length} jobs for this candidate. Return ONLY a valid JSON array with exactly ${jobsToScore.length} objects.

CANDIDATE:
${candidateContext}

JOBS:
${jobsToScore.map((job, i) => `--- JOB ${i + 1} ---
Company: ${job.company?.display_name || "Unknown"}
Title: ${job.title}
Location: ${job.location?.display_name || ""}
Description: ${(job.description || "").slice(0, 500)}`).join("\n\n")}

Return JSON array (same order): [{"score":<0-100>,"rationale":"<2 sentences: overall match and key reason>"}]`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const scores = jsonMatch ? JSON.parse(jsonMatch[0]) as Array<{ score: number; rationale: string }> : [];

    const jobs = jobsToScore.map((job, i) => ({
      id: job.id,
      company: job.company?.display_name || "Unknown",
      role: job.title,
      location: job.location?.display_name || "",
      score: scores[i]?.score ?? 50,
      score_rationale: scores[i]?.rationale ?? "",
      url: job.redirect_url,
      description: (job.description || "").slice(0, 400),
      posted_date: job.created,
    }));

    jobs.sort((a, b) => b.score - a.score);

    return NextResponse.json({ prefs, jobs });
  } catch (e) {
    console.error("jobs/preview error:", e);
    return NextResponse.json({ error: (e as { message?: string }).message ?? "Preview failed" }, { status: 500 });
  }
}
