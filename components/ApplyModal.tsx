"use client";

import { useState } from "react";
import type { Job, Kit } from "@/lib/types";

interface ApplyModalProps {
  job: Job;
  kit: Kit | null;
  onClose: () => void;
  onApplied: () => void;
}

export function ApplyModal({ job, kit, onClose, onApplied }: ApplyModalProps) {
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    setLoading(true);
    try {
      await fetch("/api/applications/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          kit_id: kit?.id,
          company: job.company,
          role: job.role,
          portal: job.portal,
        }),
      });
      onApplied();
      window.open(job.url, "_blank");
    } finally {
      setLoading(false);
    }
  };

  const personalInfo = kit?.personal_info ?? {};

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-syne font-bold text-text-primary">{job.role}</h2>
            <p className="text-text-dimmed text-sm font-dm-sans">{job.company}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-dimmed hover:text-text-primary transition-all duration-[150ms] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { label: "Name", value: personalInfo.name },
            { label: "Email", value: personalInfo.email },
            { label: "Phone", value: personalInfo.phone },
            { label: "LinkedIn", value: personalInfo.linkedin },
            { label: "Portal", value: job.portal },
          ].map(({ label, value }) =>
            value ? (
              <div key={label} className="flex items-center justify-between border border-border rounded-card px-3 py-2 bg-surface">
                <span className="text-xs text-text-dimmed font-dm-sans">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-primary font-dm-sans truncate max-w-[180px]">{value}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-surface-secondary rounded text-text-dimmed font-dm-sans">Pre-filled</span>
                </div>
              </div>
            ) : null
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-border rounded-card text-sm text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms] font-dm-sans"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={loading}
            className="flex-1 py-2 bg-btn-bg text-btn-text rounded-card text-sm font-dm-sans font-medium hover:opacity-90 transition-all duration-[150ms] disabled:opacity-50"
          >
            {loading ? "Logging..." : "Submit & Open Portal"}
          </button>
        </div>
      </div>
    </div>
  );
}
