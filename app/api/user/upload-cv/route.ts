import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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

    step = "check-config";
    if (!SUPABASE_URL.startsWith("http")) {
      return NextResponse.json({ error: "SUPABASE_URL not configured" }, { status: 500 });
    }

    step = "read-form";
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    step = "read-buffer";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    step = "parse-pdf";
    let text = "";
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text.slice(0, 8000);
    } catch (parseErr) {
      console.warn("PDF parse warning (continuing):", parseErr);
    }

    const authHeaders = {
      "Authorization": `Bearer ${accessToken}`,
      "apikey": ANON_KEY,
    };

    step = "storage-upload";
    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/cvs/${userId}/cv.pdf`,
      {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: buffer,
      }
    );
    if (!storageRes.ok) {
      const errText = await storageRes.text();
      throw new Error(`Storage error (${storageRes.status}): ${errText}`);
    }

    step = "db-update";
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ cv_url: `${userId}/cv.pdf`, cv_text: text }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`DB error (${updateRes.status}): ${errText}`);
    }

    return NextResponse.json({ path: `${userId}/cv.pdf` });
  } catch (err) {
    const msg = (err as { message?: string }).message ?? String(err);
    console.error(`upload-cv [${step}]:`, msg);
    return NextResponse.json({ error: `[${step}] ${msg}` }, { status: 500 });
  }
}
