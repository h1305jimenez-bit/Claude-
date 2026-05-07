"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserSupabase } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";
import { TrackerTable } from "@/components/TrackerTable";
import type { Application } from "@/lib/types";

interface FollowUpResult {
  subject: string;
  body: string;
}

export default function TrackerPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [followUp, setFollowUp] = useState<FollowUpResult | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpAppId, setFollowUpAppId] = useState<string>("");
  const [staleApps, setStaleApps] = useState<Application[]>([]);

  const supabase = createBrowserSupabase();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;

      const { data: apps } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", userId)
        .order("applied_date", { ascending: false });

      if (apps) {
        setApplications(apps as Application[]);

        // Find stale applications (applied > 7 days ago, status still 'applied')
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const stale = (apps as Application[]).filter(
          (a) => a.application_status === "applied" && new Date(a.applied_date) < sevenDaysAgo
        );
        setStaleApps(stale);
      }

      // Trigger status check in background
      fetch("/api/jobs/check-status", { method: "POST" }).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch("/api/applications/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, application_status: status }),
    });
    setApplications((apps) =>
      apps.map((a) => a.id === id ? { ...a, application_status: status as Application["application_status"] } : a)
    );
  };

  const handleGenerateFollowUp = async (applicationId: string) => {
    setFollowUpLoading(true);
    setFollowUpAppId(applicationId);
    setFollowUp(null);
    try {
      const res = await fetch("/api/applications/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json() as FollowUpResult;
      setFollowUp(data);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const statusCounts = {
    applied: applications.filter((a) => a.application_status === "applied").length,
    interviewing: applications.filter((a) => a.application_status === "interviewing").length,
    offer: applications.filter((a) => a.application_status === "offer").length,
    rejected: applications.filter((a) => a.application_status === "rejected").length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-syne font-bold text-2xl text-text-primary mb-1">Application Tracker</h1>
          <p className="text-text-dimmed text-sm font-dm-sans">Track every application and follow up at the right time.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="border border-border rounded-[8px] p-4 bg-surface">
              <p className="text-xs text-text-dimmed font-dm-sans capitalize mb-1">{status}</p>
              <p className="font-syne font-bold text-2xl text-text-primary">{count}</p>
            </div>
          ))}
        </div>

        {/* Stale alert */}
        {staleApps.length > 0 && (
          <div className="border border-border rounded-[8px] p-4 bg-surface mb-6">
            <p className="text-sm font-dm-sans text-text-primary mb-1">
              <span className="font-medium">{staleApps.length}</span> application{staleApps.length > 1 ? "s" : ""} with no response in 7+ days
            </p>
            <p className="text-xs text-text-dimmed font-dm-sans">
              {staleApps.map((a) => a.company).join(", ")} — consider following up.
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border rounded-[8px] h-12 animate-pulse bg-surface" />
            ))}
          </div>
        ) : (
          <TrackerTable
            applications={applications}
            onUpdate={handleStatusUpdate}
            onGenerateFollowUp={handleGenerateFollowUp}
          />
        )}

        {/* Follow-up modal */}
        {(followUpLoading || followUp) && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-[8px] w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-syne font-bold text-text-primary">Follow-up email</h2>
                <button
                  onClick={() => { setFollowUp(null); setFollowUpAppId(""); }}
                  className="text-text-dimmed hover:text-text-primary text-xl leading-none transition-all duration-[150ms]"
                >
                  ×
                </button>
              </div>
              {followUpLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-surface-secondary rounded w-1/2" />
                  <div className="h-3 bg-surface-secondary rounded w-full" />
                  <div className="h-3 bg-surface-secondary rounded w-5/6" />
                </div>
              ) : followUp ? (
                <div className="space-y-3">
                  <div className="border border-border rounded-[8px] p-3 bg-surface">
                    <p className="text-xs text-text-dimmed font-dm-sans mb-1">Subject</p>
                    <p className="text-sm font-dm-sans text-text-primary">{followUp.subject}</p>
                  </div>
                  <div className="border border-border rounded-[8px] p-3 bg-surface">
                    <p className="text-xs text-text-dimmed font-dm-sans mb-1">Body</p>
                    <p className="text-sm font-dm-sans text-text-primary leading-relaxed whitespace-pre-wrap">{followUp.body}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch("/api/applications/update", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: followUpAppId,
                          follow_up_sent: true,
                          follow_up_message: `${followUp.subject}\n\n${followUp.body}`,
                        }),
                      });
                      setFollowUp(null);
                      setFollowUpAppId("");
                    }}
                    className="w-full py-2 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms]"
                  >
                    Mark as sent
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
