import { STATUS_CONFIG } from "@/lib/statusConfig";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className, showDot = true, testId }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.badge,
        className
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}
