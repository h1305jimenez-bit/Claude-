import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface Profile {
  name: string;
  email: string;
  phone: string;
  title: string;
  skills: string[];
  experience_years: number;
  summary: string;
}

function parseGreenhouseUrl(url: string): { company: string; jobId: string } | null {
  const m = url.match(/boards\.greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/);
  return m ? { company: m[1], jobId: m[2] } : null;
}

function parseLeverUrl(url: string): { company: string; postingId: string } | null {
  const m = url.match(/jobs(?:\.eu)?\.lever\.co\/([^/?#]+)\/([a-f0-9-]{36})/i);
  return m ? { company: m[1], postingId: m[2] } : null;
}

async function generateCoverLetter(
  profile: Profile,
  job: { title: string; company: string; location: string; type: string; tags: string[]; description: string },
  apiKey: string,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const isLikelyFrench = / vous | nous | poste | entreprise /.test(
    job.description.toLowerCase(),
  );
  const lang = isLikelyFrench ? "French" : "English";

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `Write a concise professional cover letter in ${lang}.

Candidate: ${profile.name}, ${profile.title}, ${profile.experience_years}y exp.
Skills: ${profile.skills.slice(0, 8).join(", ")}.
Summary: ${profile.summary}

Job: ${job.title} at ${job.company} (${job.location}).
Tags: ${job.tags.join(", ")}.
Description excerpt: ${job.description.slice(0, 400)}

Rules:
- 3 short paragraphs
- Mention 2-3 specific skills from the job
- No placeholders — use real name and company
- End with candidate name: ${profile.name}`,
      },
    ],
  });

  return msg.content[0].type === "text" ? msg.content[0].text : "";
}

async function applyGreenhouse(
  params: { company: string; jobId: string },
  profile: Profile,
  cvBuffer: Buffer,
  cvFilename: string,
  coverLetter: string,
): Promise<boolean> {
  const jobRes = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${params.company}/jobs/${params.jobId}?questions=true`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!jobRes.ok) return false;

  const jobData = (await jobRes.json()) as { application_key?: string };
  if (!jobData.application_key) return false;

  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Candidate";
  const lastName = nameParts.slice(1).join(" ") || ".";

  const fd = new FormData();
  fd.append("application_key", jobData.application_key);
  fd.append("first_name", firstName);
  fd.append("last_name", lastName);
  fd.append("email", profile.email);
  if (profile.phone) fd.append("phone", profile.phone);
  fd.append("resume", new Blob([cvBuffer], { type: "application/pdf" }), cvFilename);
  if (coverLetter) {
    fd.append(
      "cover_letter",
      new Blob([coverLetter], { type: "text/plain" }),
      "cover_letter.txt",
    );
  }

  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${params.company}/jobs/${params.jobId}/applications`,
    { method: "POST", body: fd, signal: AbortSignal.timeout(10000) },
  );
  return res.ok;
}

async function applyLever(
  params: { company: string; postingId: string },
  profile: Profile,
  cvBuffer: Buffer,
  cvFilename: string,
  coverLetter: string,
): Promise<boolean> {
  const fd = new FormData();
  fd.append("name", profile.name);
  fd.append("email", profile.email);
  if (profile.phone) fd.append("phone", profile.phone);
  fd.append("resume", new Blob([cvBuffer], { type: "application/pdf" }), cvFilename);
  if (coverLetter) fd.append("comments", coverLetter);

  const res = await fetch(
    `https://api.lever.co/v0/postings/${params.company}/${params.postingId}/apply`,
    { method: "POST", body: fd, signal: AbortSignal.timeout(10000) },
  );
  return res.ok;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const cvFile = formData.get("cv") as File | null;
    const profileJson = formData.get("profile") as string | null;
    const jobJson = formData.get("job") as string | null;

    if (!profileJson || !jobJson) {
      return Response.json({ applied: false, error: "Missing data" }, { status: 400 });
    }

    const profile: Profile = JSON.parse(profileJson);
    const job = JSON.parse(jobJson) as {
      url: string;
      title: string;
      company: string;
      location: string;
      type: string;
      tags: string[];
      description: string;
    };

    if (!profile.email) {
      return Response.json({ applied: false, error: "No email in profile" });
    }

    const cvBuffer = cvFile ? Buffer.from(await cvFile.arrayBuffer()) : null;
    const cvFilename = cvFile?.name ?? "resume.pdf";
    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

    // Generate cover letter (runs in parallel with ATS detection)
    let coverLetter = "";
    if (apiKey) {
      try {
        coverLetter = await generateCoverLetter(profile, job, apiKey);
      } catch {
        // non-fatal — apply without cover letter
      }
    }

    // Try Greenhouse
    const ghParams = parseGreenhouseUrl(job.url);
    if (ghParams && cvBuffer) {
      const ok = await applyGreenhouse(ghParams, profile, cvBuffer, cvFilename, coverLetter);
      if (ok) return Response.json({ applied: true, ats: "Greenhouse", coverLetter });
    }

    // Try Lever
    const leverParams = parseLeverUrl(job.url);
    if (leverParams && cvBuffer) {
      const ok = await applyLever(leverParams, profile, cvBuffer, cvFilename, coverLetter);
      if (ok) return Response.json({ applied: true, ats: "Lever", coverLetter });
    }

    // Cannot auto-apply — return cover letter for manual use
    return Response.json({ applied: false, coverLetter });
  } catch (err) {
    console.error("[apply-job]", err);
    return Response.json({ applied: false, error: String(err) });
  }
}
