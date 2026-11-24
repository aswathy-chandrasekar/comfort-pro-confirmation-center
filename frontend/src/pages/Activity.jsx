import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { Send, CheckCircle2, AlertTriangle, HelpCircle, MessageSquare } from "lucide-react";

const TONE = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600 bg-emerald-50" },
  warning: { icon: AlertTriangle, iconClass: "text-orange-600 bg-orange-50" },
  info: { icon: HelpCircle, iconClass: "text-sky-600 bg-sky-50" },
  neutral: { icon: Send, iconClass: "text-slate-600 bg-slate-100" },
};

export default function Activity() {
  const { activity } = useApp();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <p className="text-xs text-slate-500">
          A chronological record of automation and dispatcher actions for this confirmation batch.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-6" data-testid="activity-timeline">
        <ol className="relative space-y-6 border-l border-slate-200 pl-6">
          {activity.map((item, i) => {
            const tone = TONE[item.tone] || TONE.neutral;
            const Icon = tone.icon;
            return (
              <li key={i} className="relative" data-testid={`activity-item-${i}`}>
                <span className={cn("absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white", tone.iconClass)}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="w-16 shrink-0 font-mono text-[11px] text-slate-500">{item.time}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{item.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{item.subtitle}</div>
                  </div>
                </div>
              </li>
            );
          })}
          {activity.length === 0 && (
            <li className="flex items-center gap-2 text-xs text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              No activity recorded for this date.
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}
