"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  onClose: () => void;
}

export function AddJobModal({ onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    company: "",
    role: "",
    location: "",
    url: "",
    description: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.company.trim() || !form.role.trim() || !form.description.trim()) {
      setError("Company, role, and job description are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { job?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to add job");
      onClose();
      router.push(`/kit/${data.job!.id}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Failed to add job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background border border-border rounded-[12px] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-syne font-bold text-lg text-text-primary">Add job manually</h2>
            <button onClick={onClose} className="text-text-dimmed hover:text-text-primary transition-all duration-[150ms] text-xl leading-none">×</button>
          </div>

          <div className="space-y-4">
            {[
              { key: "company" as const, label: "Company *", placeholder: "Stripe", type: "text" },
              { key: "role" as const, label: "Job title *", placeholder: "Senior Product Manager", type: "text" },
              { key: "location" as const, label: "Location", placeholder: "San Francisco, CA (optional)", type: "text" },
              { key: "url" as const, label: "Application URL", placeholder: "https://stripe.com/jobs/... (optional)", type: "url" },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-text-dimmed font-dm-sans mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms]"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs text-text-dimmed font-dm-sans mb-1">Job description *</label>
              <textarea
                value={form.description}
                onChange={set("description")}
                placeholder="Paste the full job description here..."
                rows={8}
                className="w-full border border-border rounded-[8px] px-3 py-2 text-sm font-dm-sans bg-background text-text-primary placeholder:text-text-dimmed focus:outline-none focus:border-text-primary transition-all duration-[150ms] resize-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-500 font-dm-sans mt-3">{error}</p>}

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-[8px] text-sm font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface transition-all duration-[150ms]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 bg-btn-bg text-btn-text rounded-[8px] text-sm font-dm-sans hover:opacity-90 transition-all duration-[150ms] disabled:opacity-40"
            >
              {saving ? "Adding & scoring…" : "Add job →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
