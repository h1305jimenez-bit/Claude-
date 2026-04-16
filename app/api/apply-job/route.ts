import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface Profile {
  name: string;
  email: string;
  phone: string;
}

function parseGreenhouseUrl(url: string): { company: string; jobId: string } | null {
  const m = url.match(/boards\.greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/);
  if (m) return { company: m[1], jobId: m[2] };
  return null;
}

function parseLeverUrl(url: string): { company: string; postingId: string } | null {
  const m = url.match(/jobs(?:\.eu)?\.lever\.co\/([^/?#]+)\/([a-f0-9-]{36})/i);
  if (m) return { company: m[1], postingId: m[2] };
  return null;
}

async function applyGreenhouse(
  params: { company: string; jobId: string },
  profile: Profile,
  cvBuffer: Buffer,
  cvFilename: string,
): Promise<boolean> {
  // Fetch job to get the required application_key
  const jobRes = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${params.company}/jobs/${params.jobId}?questions=true`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!jobRes.ok) return false;

  const jobData = await jobRes.json() as { application_key?: string };
  const applicationKey = jobData.application_key;
  if (!applicationKey) return false;

  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Candidate";
  const lastName = nameParts.slice(1).join(" ") || ".";

  const fd = new FormData();
  fd.append("application_key", applicationKey);
  fd.append("first_name", firstName);
  fd.append("last_name", lastName);
  fd.append("email", profile.email);
  if (profile.phone) fd.append("phone", profile.phone);
  fd.append(
    "resume",
    new Blob([cvBuffer], { type: "application/pdf" }),
    cvFilename,
  );

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
): Promise<boolean> {
  const fd = new FormData();
  fd.append("name", profile.name);
  fd.append("email", profile.email);
  if (profile.phone) fd.append("phone", profile.phone);
  fd.append(
    "resume",
    new Blob([cvBuffer], { type: "application/pdf" }),
    cvFilename,
  );

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
    const job: { url: string } = JSON.parse(jobJson);

    if (!profile.email) {
      return Response.json({ applied: false, error: "No email in profile" });
    }

    const cvBuffer = cvFile ? Buffer.from(await cvFile.arrayBuffer()) : null;
    const cvFilename = cvFile?.name ?? "resume.pdf";

    // Try Greenhouse
    const ghParams = parseGreenhouseUrl(job.url);
    if (ghParams && cvBuffer) {
      const ok = await applyGreenhouse(ghParams, profile, cvBuffer, cvFilename);
      if (ok) return Response.json({ applied: true, ats: "Greenhouse" });
    }

    // Try Lever
    const leverParams = parseLeverUrl(job.url);
    if (leverParams && cvBuffer) {
      const ok = await applyLever(leverParams, profile, cvBuffer, cvFilename);
      if (ok) return Response.json({ applied: true, ats: "Lever" });
    }

    // ATS not supported — tell frontend to open URL
    return Response.json({ applied: false });
  } catch (err) {
    console.error("[apply-job]", err);
    return Response.json({ applied: false, error: String(err) });
  }
}
