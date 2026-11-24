import { CalendarDays, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function Metric({ label, value, sublabel, icon: Icon, tone, active, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      data-active={active || undefined}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-white text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2 motion-safe:hover:-translate-y-[2px]",
        tone === "amber"
          ? "border-amber-300/70 bg-gradient-to-b from-amber-50/40 to-white shadow-[0_1px_0_rgba(15,23,42,0.02),0_10px_24px_-14px_rgba(217,119,6,0.3)] hover:shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_32px_-14px_rgba(217,119,6,0.42)] hover:border-amber-400/80"
          : "border-slate-200/80 shadow-[0_1px_0_rgba(15,23,42,0.02)] hover:border-slate-300 hover:shadow-[0_1px_0_rgba(15,23,42,0.02),0_10px_26px_-14px_rgba(15,23,42,0.25)]",
        active && "ring-2 ring-blue-500/40 ring-offset-2"
      )}
    >
      <div className="flex items-start justify-between p-5">
        <div className="min-w-0">
          <div className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", tone === "amber" ? "text-amber-700" : "text-slate-500")}>
            {label}
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "font-semibold tracking-tight tabular-nums",
                tone === "amber" ? "text-amber-700 text-4xl" : "text-slate-900 text-3xl"
              )}
              style={{ fontFamily: "Outfit, Inter, sans-serif" }}
            >
              {value}
            </span>
          </div>
          {sublabel && <div className="mt-2 text-[11px] text-slate-500">{sublabel}</div>}
        </div>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            tone === "amber" && "bg-amber-100/70 text-amber-700 group-hover:bg-amber-100",
            tone === "emerald" && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
            tone === "slate" && "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "h-1 w-full",
          tone === "amber" ? "bg-gradient-to-r from-amber-400 to-amber-600" : tone === "emerald" ? "bg-emerald-500/70" : "bg-slate-200"
        )}
      />
    </button>
  );
}

export function SummaryMetrics({ summary, batchLabel, activeFilter, onFilterChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4" data-testid="summary-metrics">
      <Metric
        testId="metric-total-appointments"
        label="Appointments"
        value={summary.total}
        sublabel={`Confirmation batch for ${batchLabel}`}
        icon={CalendarDays}
        tone="slate"
        active={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <Metric
        testId="metric-handled-auto"
        label="Confirmed"
        value={summary.confirmed}
        sublabel="Automatically resolved"
        icon={CheckCircle2}
        tone="emerald"
        active={activeFilter === "confirmed"}
        onClick={() => onFilterChange("confirmed")}
      />
      <Metric
        testId="metric-needs-attention"
        label="Needs review"
        value={summary.needsAttention}
        sublabel="Customer follow-up required"
        icon={AlertCircle}
        tone="amber"
        active={activeFilter === "needs_attention"}
        onClick={() => onFilterChange("needs_attention")}
      />
    </div>
  );
}
