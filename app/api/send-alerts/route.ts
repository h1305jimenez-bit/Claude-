import { NextRequest } from "next/server";
import { Resend } from "resend";
import type { JobAlert } from "@/lib/job-alerts";
import type { UnifiedJob } from "@/app/api/search-jobs/route";

export const runtime = "nodejs";

const FROM =
  process.env.RESEND_FROM || "Job Alerts <onboarding@resend.dev>";

async function fetchJobs(query: string): Promise<UnifiedJob[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/search-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { jobs: UnifiedJob[] };
  return data.jobs ?? [];
}

function renderAlertEmail(jobs: UnifiedJob[], query: string): string {
  const rows = jobs
    .slice(0, 8)
    .map(
      (j) => `
    <tr style="border-bottom:1px solid #E8E1D1;">
      <td style="padding:12px 0;">
        <div style="font-weight:600;color:#0C2340;">${j.title}</div>
        <div style="font-size:13px;color:#64748b;">${j.company} · ${j.location}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${j.source} · ${j.postedAt}</div>
      </td>
      <td style="padding:12px 0;text-align:right;vertical-align:top;">
        <a href="${j.url}" style="display:inline-block;padding:6px 14px;background:#0C2340;color:#fff;border-radius:20px;font-size:12px;font-weight:600;text-decoration:none;">
          Apply →
        </a>
      </td>
    </tr>`,
    )
    .join("");

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#FAF7F0;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
    <div style="font-size:13px;color:#C9A227;font-weight:600;letter-spacing:.1em;text-transform:uppercase;">AI Job Search</div>
    <h1 style="color:#0C2340;margin:8px 0 4px;font-size:20px;">New jobs matching "${query}"</h1>
    <p style="color:#64748b;font-size:14px;margin:0 0 24px;">${jobs.length} new listing${jobs.length !== 1 ? "s" : ""} since your last check.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;text-align:center;">
      You're receiving this because you saved a job alert.
    </p>
  </div>
</div>`;
}

export async function POST(req: NextRequest) {
  try {
    const { alerts } = (await req.json()) as { alerts: JobAlert[] };
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return Response.json({ results: [] });
    }

    const client = process.env.RESEND_API_KEY
      ? new Resend(process.env.RESEND_API_KEY)
      : null;

    const results = await Promise.all(
      alerts.map(async (alert) => {
        try {
          const jobs = await fetchJobs(alert.query);
          const newJobs = jobs.filter((j) => !alert.seenJobIds.includes(j.id));
          const allIds = jobs.map((j) => j.id);

          if (newJobs.length > 0 && client) {
            await client.emails.send({
              from: FROM,
              to: alert.email,
              subject: `🔔 ${newJobs.length} new job${newJobs.length !== 1 ? "s" : ""} matching "${alert.query}"`,
              html: renderAlertEmail(newJobs, alert.query),
            });
          }

          return { alertId: alert.id, newJobCount: newJobs.length, allIds };
        } catch (err) {
          console.error("[send-alerts] alert failed:", err);
          return { alertId: alert.id, newJobCount: 0, allIds: [] };
        }
      }),
    );

    return Response.json({ results });
  } catch (err) {
    console.error("[send-alerts]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
