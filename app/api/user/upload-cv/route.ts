import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type ExtractedPrefs = {
  name: string; phone: string; linkedin: string; education: string;
  target_role: string; seniority: string; salary_expectation: string; work_authorization: string;
};

async function extractFromPdf(buffer: Buffer): Promise<{ prefs: ExtractedPrefs; cvText: string } | null> {
  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
          } as never,
          {
            type: "text",
            text: `Extract information from this CV. Return ONLY a valid JSON object with these exact keys (use empty string if not found):
name, phone, linkedin, education (degree + institution), target_role (most recent job title or role they are applying for), seniority (one of: Intern/Junior/Mid-level/Senior/Lead/Manager/Director/Executive), salary_expectation, work_authorization, cv_text (full CV text content, max 6000 chars).`,
          },
        ],
      }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ExtractedPrefs & { cv_text?: string };
    const { cv_text, ...prefs } = parsed;
    return { prefs, cvText: cv_text ?? "" };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let step = "init";
  try {
    step = "read-token";
    const accessToken = req.headers.get("x-access-token");
    if (!accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    step = "decode-jwt";
    const [, rawPayload] = accessToken.split(".");
    if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const padded = rawPayload + "=".repeat((4 - rawPayload.length % 4) % 4);
    const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf-8")) as { sub?: string };
    const userId = payload.sub;
    if (!userId) return NextResponse.json({ error: "No user ID in token" }, { status: 401 });

    if (!SUPABASE_URL.startsWith("http")) {
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    step = "read-buffer";
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer.byteLength) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const buffer = Buffer.from(arrayBuffer);

    step = "extract-prefs";
    const extracted = await extractFromPdf(buffer);
    const prefs = extracted?.prefs ?? null;
    const cvText = extracted?.cvText ?? "";

    const authHeaders = { "Authorization": `Bearer ${accessToken}`, "apikey": ANON_KEY };

    step = "storage-upload";
    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/cvs/${userId}/cv.pdf`,
      { method: "POST", headers: { ...authHeaders, "Content-Type": "application/pdf", "x-upsert": "true" }, body: buffer }
    );
    if (!storageRes.ok) {
      const errText = await storageRes.text();
      throw new Error(`Storage error (${storageRes.status}): ${errText}`);
    }

    step = "db-update";
    const updatePayload: Record<string, string> = { cv_url: `${userId}/cv.pdf`, cv_text: cvText };
    if (prefs) {
      if (prefs.name) updatePayload.name = prefs.name;
      if (prefs.phone) updatePayload.phone = prefs.phone;
      if (prefs.linkedin) updatePayload.linkedin = prefs.linkedin;
      if (prefs.education) updatePayload.education = prefs.education;
      if (prefs.target_role) updatePayload.target_role = prefs.target_role;
      if (prefs.seniority) updatePayload.seniority = prefs.seniority;
      if (prefs.salary_expectation) updatePayload.salary_expectation = prefs.salary_expectation;
      if (prefs.work_authorization) updatePayload.work_authorization = prefs.work_authorization;
    }

    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      { method: "PATCH", headers: { ...authHeaders, "Content-Type": "application/json", "Prefer": "return=minimal" }, body: JSON.stringify(updatePayload) }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`DB error (${updateRes.status}): ${errText}`);
    }

    return NextResponse.json({
      path: `${userId}/cv.pdf`,
      prefsExtracted: !!prefs,
      prefs: prefs ?? {},
    });
  } catch (err) {
    const msg = (err as { message?: string }).message ?? String(err);
    console.error(`upload-cv [${step}]:`, msg);
    return NextResponse.json({ error: `[${step}] ${msg}` }, { status: 500 });
  }
}
