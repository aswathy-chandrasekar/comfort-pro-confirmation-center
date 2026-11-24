import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import { Phone, MapPin, Wrench, Clock, User, ChevronDown, CheckCheck, PhoneCall, MessageSquare, ArrowRight, ShieldAlert, Cpu, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function Section({ title, children, className }) {
  return (
    <div className={cn("border-t border-slate-100 px-6 py-5", className)}>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
      {children}
    </div>
  );
}

export function AppointmentDetailDrawer({ appointment, open, onOpenChange, onMarkReviewed, onUndo }) {
  const [showAutomation, setShowAutomation] = useState(false);

  useEffect(() => {
    if (!open) setShowAutomation(false);
  }, [open]);

  if (!appointment) return null;
  const cfg = STATUS_CONFIG[appointment.status];
  const nameSlug = slug(appointment.customerName);
  const isNlp = appointment.automation?.processedUsing === "nlp";
  const isExactRule = appointment.automation?.processedUsing === "exact_rule";
  const isConfirmedFlow = appointment.status === "confirmed";

  const handleMarkReviewed = () => {
    onMarkReviewed(appointment.id);
    toast.success(`Marked ${appointment.customerName} as reviewed`, {
      description: "Removed from your review queue.",
      duration: 8000,
      action: { label: "Undo", onClick: () => onUndo(appointment.id) },
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl" data-testid="detail-drawer">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0">
              <SheetTitle className="truncate text-xl font-semibold tracking-tight text-slate-900" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
                {appointment.customerName}
              </SheetTitle>
              <div className="mt-1.5 flex items-center gap-2">
                <StatusBadge status={appointment.status} />
                <span className="text-xs text-slate-300">·</span>
                <span className="font-mono text-xs text-slate-500">Job #{appointment.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-5">
          <FactRow icon={Phone} label="Phone" value={appointment.phone} mono />
          <FactRow icon={MapPin} label="Address" value={appointment.address} />
          <FactRow icon={Wrench} label="Service" value={appointment.service} />
          <FactRow icon={Clock} label="Appointment" value={appointment.window} />
          <FactRow icon={User} label="Technician" value={appointment.technician} />
          <FactRow icon={ShieldAlert} label="Service note" value={appointment.serviceNote} />
        </div>

        <Section title="Conversation">
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 px-3.5 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Comfort Pro</span>
                <span className="text-[10px] text-slate-500">{appointment.confirmationSent.time}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-700">{appointment.confirmationSent.body}</p>
            </div>
            {appointment.customerReply ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 px-3.5 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">{appointment.customerName.split(" ")[0]}</span>
                  <span className="text-[10px] text-blue-700/80">{appointment.customerReply.time}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-800">&ldquo;{appointment.customerReply.body}&rdquo;</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-3 text-xs text-slate-500">
                <MessageSquare className="h-3.5 w-3.5" />
                Customer has not responded.
              </div>
            )}
          </div>
        </Section>

        <Section title="System result">
          <div className={cn("rounded-lg px-4 py-3.5", cfg?.badge)}>
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", cfg?.dot)} />
              <span className="text-sm font-semibold">{appointment.resultMessage}</span>
            </div>
            {isExactRule && isConfirmedFlow && (
              <div className="mt-1.5 text-xs opacity-90">Exact confirmation response recognized. AI was not required.</div>
            )}
            {isNlp && appointment.status === "schedule_change" && (
              <div className="mt-1.5 text-xs opacity-90">Customer requested a different appointment time.</div>
            )}
            {isNlp && appointment.status === "question" && (
              <div className="mt-1.5 text-xs opacity-90">Customer asked a question that requires a personal response.</div>
            )}
            {appointment.status === "no_response" && appointment.resultNote && (
              <div className="mt-1.5 text-xs opacity-90">{appointment.resultNote}</div>
            )}
            {isNlp && isConfirmedFlow && appointment.resultNote && (
              <div className="mt-1.5 text-xs opacity-90">{appointment.resultNote}</div>
            )}
            {appointment.recommendedAction && (
              <div className="mt-2 text-xs font-medium opacity-90">Recommended action: {appointment.recommendedAction}</div>
            )}
            {appointment.resultNote && appointment.status === "schedule_change" && (
              <div className="mt-2.5 border-t border-current/10 pt-2.5 text-[11px] font-semibold opacity-95">{appointment.resultNote}</div>
            )}
          </div>
        </Section>

        <Section title="Timeline">
          <ol className="relative space-y-3.5 border-l border-slate-200 pl-4">
            {appointment.timeline?.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
                <div className="flex items-baseline gap-3">
                  <span className="w-16 shrink-0 font-mono text-[11px] text-slate-500">{t.time}</span>
                  <span className="text-[13px] text-slate-700">{t.event}</span>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Automation details">
          <button
            type="button"
            onClick={() => setShowAutomation((v) => !v)}
            data-testid="automation-details-expandable"
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
              {isNlp ? <Cpu className="h-3.5 w-3.5 text-blue-600" /> : <Zap className="h-3.5 w-3.5 text-slate-500" />}
              {showAutomation ? "Hide" : "Show"} how this was processed
            </span>
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showAutomation && "rotate-180")} />
          </button>
          {showAutomation && (
            <div className="mt-3 space-y-2 rounded-lg bg-slate-50 px-3.5 py-3 text-xs">
              <AutomationRow
                label="Processing"
                value={isExactRule ? "Deterministic rule" : isNlp ? "AI classification" : "System rule"}
              />
              {appointment.automation?.intent && !isExactRule && (
                <AutomationRow label="Intent" value={appointment.automation.intent} />
              )}
              {isNlp && appointment.automation?.confidence != null && (
                <AutomationRow label="Confidence" value={`${Math.round(appointment.automation.confidence * 100)}%`} />
              )}
              <AutomationRow
                label="Decision"
                value={isConfirmedFlow ? "Confirmed" : "Human review"}
              />
            </div>
          )}
        </Section>

        <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          {!isConfirmedFlow ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
              {appointment.status === "no_response" ? (
                <button
                  type="button"
                  data-testid={`drawer-action-call-customer-${nameSlug}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_10px_-2px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700"
                >
                  <PhoneCall className="h-4 w-4" />
                  Call Customer
                </button>
              ) : appointment.status === "question" ? (
                <button
                  type="button"
                  data-testid={`drawer-action-respond-${nameSlug}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_10px_-2px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Review Question
                </button>
              ) : (
                <button
                  type="button"
                  data-testid={`drawer-action-review-${nameSlug}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_4px_10px_-2px_rgba(37,99,235,0.35)] transition-all hover:bg-blue-700"
                >
                  <ArrowRight className="h-4 w-4" />
                  Review Request
                </button>
              )}
              <button
                type="button"
                data-testid="drawer-action-mark-reviewed"
                onClick={handleMarkReviewed}
                disabled={appointment.reviewed}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                {appointment.reviewed ? "Reviewed" : "Mark reviewed"}
              </button>
            </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                <CheckCheck className="h-4 w-4" /> Automatically confirmed. No dispatcher action needed.
              </div>
              {appointment.lateReplyProcessed && (
                <div className="rounded-lg bg-slate-50 px-3.5 py-2 text-[11px] text-slate-600">
                  Late reply processed after the response checkpoint. Prior no response event preserved in activity.
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FactRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
        <div className={cn("truncate text-sm text-slate-800", mono && "font-mono text-[13px]")}>{value}</div>
      </div>
    </div>
  );
}

function AutomationRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  );
}
