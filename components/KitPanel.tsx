"use client";

interface KitPanelProps {
  title: string;
  children: React.ReactNode;
}

export function KitPanel({ title, children }: KitPanelProps) {
  return (
    <div className="border border-border rounded-card p-6 bg-surface">
      <h3 className="font-syne font-bold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  );
}

export function KitSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="w-8 h-8 rounded-full border-2 border-border border-t-text-primary animate-spin" />
      <p className="text-xs text-text-dimmed font-dm-sans">Generating your kit…</p>
    </div>
  );
}
