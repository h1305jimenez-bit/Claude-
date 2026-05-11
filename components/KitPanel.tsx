"use client";

import { useState } from "react";

interface KitPanelProps {
  title: string;
  children: React.ReactNode;
  copyText?: string;
}

export function KitPanel({ title, children, copyText }: KitPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-card p-6 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-text-primary">{title}</h3>
        {copyText && (
          <button
            onClick={handleCopy}
            className="text-xs px-3 py-1 border border-border rounded-[6px] font-dm-sans text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms]"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function KitSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border rounded-card p-6 bg-surface animate-pulse">
          <div className="h-4 bg-surface-secondary rounded w-1/3 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-surface-secondary rounded w-full" />
            <div className="h-3 bg-surface-secondary rounded w-5/6" />
            <div className="h-3 bg-surface-secondary rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}
