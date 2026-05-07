"use client";

import { useState } from "react";
import type { Application } from "@/lib/types";

const APPLICATION_STATUSES = ["applied", "interviewing", "offer", "rejected", "withdrawn"] as const;

interface TrackerTableProps {
  applications: Application[];
  onUpdate: (id: string, status: string) => void;
  onGenerateFollowUp: (applicationId: string) => void;
}

export function TrackerTable({ applications, onUpdate, onGenerateFollowUp }: TrackerTableProps) {
  if (applications.length === 0) {
    return (
      <div className="border border-border rounded-card p-8 text-center bg-surface">
        <p className="text-text-dimmed font-dm-sans text-sm">No applications yet.</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-card overflow-hidden">
      <table className="w-full text-sm font-dm-sans">
        <thead className="bg-surface border-b border-border">
          <tr>
            {["Company", "Role", "Portal", "Applied", "Status", "Posting", "Actions"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs text-text-dimmed font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.map((app, i) => (
            <tr
              key={app.id}
              className={`border-b border-border last:border-0 hover:bg-surface transition-all duration-[150ms] ${
                i % 2 === 0 ? "bg-background" : "bg-surface"
              }`}
            >
              <td className="px-4 py-3 text-text-primary font-medium">{app.company}</td>
              <td className="px-4 py-3 text-text-dimmed">{app.role}</td>
              <td className="px-4 py-3 text-text-dimmed">{app.portal}</td>
              <td className="px-4 py-3 text-text-dimmed">
                {new Date(app.applied_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <StatusDropdown
                  value={app.application_status}
                  onChange={(v) => onUpdate(app.id, v)}
                />
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 border border-border rounded-full ${
                  app.posting_status === "closed" ? "text-text-dimmed" : "text-text-primary"
                }`}>
                  {app.posting_status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onGenerateFollowUp(app.id)}
                  className="text-xs px-2 py-1 border border-border rounded-[6px] text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
                >
                  Follow up
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs border border-border rounded-[6px] px-2 py-1 bg-background text-text-primary font-dm-sans focus:outline-none hover:bg-surface transition-all duration-[150ms]"
    >
      {APPLICATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </option>
      ))}
    </select>
  );
}
