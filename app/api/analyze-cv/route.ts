import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require("pdf-parse");

export const runtime = "nodejs";

export interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
  title: string;
  skills: string[];
  experience_years: number;
  education: string;
  languages: string[];
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > 6 * 1024 * 1024) {
      return Response.json({ error: "File too large (max 6 MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";
    try {
      const pdf = await pdfParse(buffer);
      text = pdf.text.slice(0, 10_000);
    } catch (pdfErr) {
      console.error("[analyze-cv] pdf-parse error:", pdfErr);
      return Response.json(
        { error: `Could not read PDF: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}` },
        { status: 422 },
      );
    }

    if (!text.trim()) {
      return Response.json({ error: "PDF appears to be empty or image-only." }, { status: 422 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are a CV parser. Extract structured info and return ONLY valid JSON — no markdown, no explanation.",
      messages: [
        {
          role: "user",
          content: `Parse this CV. Return this exact JSON structure:
{
  "name": "Full name or 'Unknown'",
  "email": "email or ''",
  "phone": "phone or ''",
  "title": "Current or target job title",
  "skills": ["skill1", "skill2"],
  "experience_years": 0,
  "education": "Highest degree and institution",
  "languages": ["English"],
  "summary": "2-sentence professional summary"
}

CV:
${text}`,
        },
      ],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json({ error: "Could not parse CV structure" }, { status: 422 });
    }

    const profile: CandidateProfile = JSON.parse(jsonMatch[0]);
    return Response.json({ profile });
  } catch (err) {
    console.error("[analyze-cv]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 },
    );
  }
}
