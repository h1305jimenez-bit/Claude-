import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    // Get access token passed from browser (browser SDK works fine, API route SDK has key-format issues)
    const authHeader = req.headers.get("x-access-token");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Decode user ID from JWT payload (base64url → base64 → JSON)
    const [, rawPayload] = authHeader.split(".");
    if (!rawPayload) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const base64 = rawPayload.replace(/-/g, "+").replace(/_/g, "/");
    const { sub: userId } = JSON.parse(Buffer.from(base64, "base64").toString("utf-8")) as { sub: string };
    if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text
    const parsed = await pdfParse(buffer);
    const text = parsed.text.slice(0, 8000);

    const bearer = `Bearer ${authHeader}`;
    const headers = { "Authorization": bearer, "apikey": ANON_KEY };

    // Upload to storage via REST (no SDK, bypasses key-format issue)
    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/cvs/${userId}/cv.pdf`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/pdf", "x-upsert": "true" },
        body: buffer,
      }
    );
    if (!storageRes.ok) {
      const errText = await storageRes.text();
      throw new Error(`Storage: ${errText}`);
    }

    // Update user record via REST
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json", "Prefer": "return=minimal" },
        body: JSON.stringify({ cv_url: `${userId}/cv.pdf`, cv_text: text }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`DB: ${errText}`);
    }

    return NextResponse.json({ path: `${userId}/cv.pdf` });
  } catch (err) {
    const e = err as { message?: string };
    console.error("upload-cv error:", e.message ?? err);
    return NextResponse.json({ error: e.message ?? "Failed to upload CV" }, { status: 500 });
  }
}
