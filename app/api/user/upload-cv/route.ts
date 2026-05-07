import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApiClient } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createApiClient(
      () => cookieStore.getAll(),
      (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          );
        } catch {}
      }
    );
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const formData = await req.formData();
    const file = formData.get("cv") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF text
    const parsed = await pdfParse(buffer);
    const text = parsed.text.slice(0, 8000);

    // Upload via REST API directly — bypasses SDK key-format validation issues
    const authHeader = SERVICE_KEY
      ? `Bearer ${SERVICE_KEY}`
      : `Bearer ${session.access_token}`;

    const storageRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/cvs/${userId}/cv.pdf`,
      {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "apikey": SERVICE_KEY || session.access_token,
          "Content-Type": "application/pdf",
          "x-upsert": "true",
        },
        body: buffer,
      }
    );
    if (!storageRes.ok) {
      const errText = await storageRes.text();
      throw new Error(`Storage upload failed: ${errText}`);
    }

    const storagePath = `${userId}/cv.pdf`;

    // Update user record via REST
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": authHeader,
          "apikey": SERVICE_KEY || session.access_token,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ cv_url: storagePath, cv_text: text }),
      }
    );
    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`User update failed: ${errText}`);
    }

    return NextResponse.json({ path: storagePath, text });
  } catch (err) {
    const e = err as { message?: string };
    console.error("upload-cv error:", e.message ?? err);
    return NextResponse.json({ error: e.message ?? "Failed to upload CV" }, { status: 500 });
  }
}
