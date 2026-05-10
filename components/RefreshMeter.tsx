"use client";

interface RefreshMeterProps {
  remaining: number;
  total?: number;
  isPaid?: boolean;
  onRefresh: () => void;
  loading: boolean;
  onReset?: () => void;
}

export function RefreshMeter({ remaining, total = 5, isPaid = false, onRefresh, loading, onReset }: RefreshMeterProps) {
  const used = total - remaining;

  return (
    <div className="border border-border rounded-card p-4 bg-surface">
      <p className="text-xs text-text-dimmed font-dm-sans mb-2">Job refreshes</p>
      {isPaid ? (
        <p className="text-sm font-dm-sans text-text-primary mb-3">
          <span className="font-syne font-bold">Unlimited</span>
        </p>
      ) : (
        <>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-[150ms] ${
                  i < used ? "bg-text-primary" : "bg-surface-secondary"
                }`}
              />
            ))}
          </div>
          <p className="text-sm font-dm-sans text-text-primary mb-3">
            <span className="font-syne font-bold">{remaining}</span>
            <span className="text-text-dimmed"> / {total} left today</span>
          </p>
        </>
      )}
      <button
        onClick={onRefresh}
        disabled={loading || (!isPaid && remaining === 0)}
        className="w-full py-2 px-3 text-sm border border-border rounded-card text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] disabled:opacity-40 disabled:cursor-not-allowed font-dm-sans"
      >
        {loading ? "Fetching..." : "Refresh jobs"}
      </button>
      {!isPaid && remaining === 0 && onReset && (
        <button
          onClick={onReset}
          className="w-full mt-2 py-1.5 px-3 text-xs border border-border rounded-card text-text-dimmed hover:text-text-primary hover:bg-surface-secondary transition-all duration-[150ms] font-dm-sans"
        >
          Reset counter
        </button>
      )}
    </div>
  );
}
