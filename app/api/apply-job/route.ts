import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { profile, job } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });

    // Detect if job description/company suggests non-English language
    const descLower = (job.description as string).toLowerCase();
    const isLikelyFrench =
      descLower.includes(" vous ") ||
      descLower.includes(" nous ") ||
      descLower.includes(" poste ") ||
      descLower.includes(" entreprise ");
    const language = isLikelyFrench ? "French" : "English";

    // Stream the application letter
    const stream = client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Write a professional job application message in ${language} for this role.

Candidate:
- Name: ${profile.name}
- Current title: ${profile.title}
- Skills: ${(profile.skills as string[]).slice(0, 10).join(", ")}
- Experience: ${profile.experience_years} years
- Education: ${profile.education}
- Summary: ${profile.summary}

Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Type: ${job.type}
- Tags: ${(job.tags as string[]).join(", ")}
- Description excerpt: ${job.description}

Instructions:
- 3 short paragraphs: brief intro + why this role, relevant experience matching job requirements, enthusiastic closing
- Mention 2-3 specific skills from the job tags/description
- Professional and direct tone
- End with candidate name: ${profile.name}
- NO placeholders like [Company] — use the actual company name: ${job.company}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[apply-job]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to generate application" },
      { status: 500 },
    );
  }
}
