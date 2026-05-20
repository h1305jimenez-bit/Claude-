import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer.byteLength) return NextResponse.json({ error: "No file" }, { status: 400 });
  const buffer = Buffer.from(arrayBuffer);

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
          } as never,
          {
            type: "text",
            text: `Extract information from this CV. Return ONLY a valid JSON object with these exact keys (use empty string if not found): name, phone, linkedin, education (degree + institution), target_role (most recent job title or role they are applying for), seniority (one of: Intern/Junior/Mid-level/Senior/Lead/Manager/Director/Executive), salary_expectation, work_authorization.`,
          },
        ],
      }],
    });
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Could not parse CV" }, { status: 422 });
    return NextResponse.json({ prefs: JSON.parse(match[0]) });
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string }).message ?? "Parse failed" }, { status: 500 });
  }
}
