import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createApiClient, supabaseAdmin } from "@/lib/supabase";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

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

    // Upload to storage using service key (bypasses RLS/key format issues)
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from("cvs")
      .upload(`${userId}/cv.pdf`, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) throw uploadErr;

    // Update user record
    await supabaseAdmin
      .from("users")
      .update({ cv_url: uploadData.path, cv_text: text })
      .eq("id", userId);

    return NextResponse.json({ path: uploadData.path, text });
  } catch (err) {
    console.error("upload-cv error:", err);
    return NextResponse.json({ error: "Failed to upload CV" }, { status: 500 });
  }
}
