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
