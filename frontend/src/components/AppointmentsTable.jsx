import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "@/lib/statusConfig";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CheckCheck,
  Clock3,
  MessageSquareOff,
  PhoneCall,
  MessageSquare,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function slug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function actionFor(status) {
  switch (status) {
    case "schedule_change":
      return {
        label: "Review Request",
        icon: Eye,
      };

    case "question":
      return {
        label: "Review Question",
        icon: MessageSquare,
      };

    case "no_response":
      return {
        label: "Call Customer",
        icon: PhoneCall,
      };

    case "needs_review":
      return {
        label: "Review Reply",
        icon: Eye,
      };

    default:
      return {
        label: "Review",
        icon: Eye,
      };
  }
}

function fmtPhone(phone) {
  const digits = (phone || "").replace(/\D/g, "");

  if (digits.length !== 10) {
    return phone;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(
    3,
    6
  )}-${digits.slice(6)}`;
}

function CustomerReply({ appointment }) {
  if (appointment.customerReply) {
    return (
      <div className="max-w-[280px] truncate text-[12.5px] italic text-slate-700">
        &ldquo;{appointment.customerReply.body}&rdquo;
      </div>
    );
  }

  /*
   * Pending means the confirmation workflow has not received
   * a customer response yet. It is not a no-response exception.
   */
  if (appointment.status === "pending") {
    return (
      <div className="inline-flex items-center gap-1 text-[12px] text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        Awaiting confirmation
      </div>
    );
  }

  if (appointment.status === "no_response") {
    return (
      <div className="inline-flex items-center gap-1 text-[12px] text-slate-500">
        <MessageSquareOff className="h-3.5 w-3.5" />
        No response
      </div>
    );
  }

  return (
    <div className="text-[12px] text-slate-400">
      No reply recorded
    </div>
  );
}

function AppointmentAction({ appointment, nameSlug }) {
  const isConfirmed = appointment.status === "confirmed";
  const isPending = appointment.status === "pending";

  if (isConfirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
        <CheckCheck className="h-3.5 w-3.5" />
        Auto handled
      </span>
    );
  }

  /*
   * Pending appointments do not require dispatcher review.
   * They are simply waiting for the confirmation workflow.
   */
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
        <Clock3 className="h-3.5 w-3.5" />
        Waiting
      </span>
    );
  }

  const action = actionFor(appointment.status);
  const ActionIcon = action.icon;

  return (
    <span
      data-testid={`row-action-${nameSlug}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition-all group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white"
    >
      <ActionIcon className="h-3.5 w-3.5" />
      {action.label}
    </span>
  );
}

function Row({
  appointment,
  onOpen,
  index,
  relativeLabel,
}) {
  const cfg = STATUS_CONFIG[appointment.status];
  const reviewed = appointment.reviewed;
  const nameSlug = slug(appointment.customerName);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{
        opacity: reviewed ? 0.55 : 1,
        y: 0,
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.16,
        delay: index * 0.008,
      }}
      data-testid={`needs-attention-row-${nameSlug}`}
      onClick={() => onOpen(appointment.id)}
      className="group cursor-pointer border-b border-slate-100 bg-white transition-colors last:border-b-0 hover:bg-slate-50/80 focus-within:bg-slate-50"
    >
      <td className="relative w-1 p-0">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-[3px]",
            cfg?.stripe
          )}
        />
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle">
        <span className="font-mono text-[12px] font-medium text-slate-700">
          #{appointment.id}
        </span>
      </td>

      <td className="px-3 py-3 align-middle">
        <div className="text-[13.5px] font-semibold text-slate-900">
          {appointment.customerName}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle">
        <span className="font-mono text-[12px] text-slate-600">
          {fmtPhone(appointment.phone)}
        </span>
      </td>

      <td className="px-3 py-3 align-middle">
        <div className="text-[13px] font-medium text-slate-800">
          {appointment.service}
        </div>

        <div className="mt-0.5 max-w-[240px] truncate text-[11px] text-slate-500">
          {appointment.serviceNote}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle">
        <div className="text-[13px] font-medium text-slate-800">
          {appointment.window}
        </div>

        <div className="mt-0.5 text-[11px] text-slate-500">
          {relativeLabel}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle">
        <span className="text-[13px] text-slate-700">
          {appointment.technician}
        </span>
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          <StatusBadge
            status={appointment.status}
            testId={`row-status-${nameSlug}`}
          />

          {reviewed && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-600">
              <CheckCheck className="h-3 w-3" />
              Reviewed
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3 align-middle">
        <CustomerReply appointment={appointment} />
      </td>

      <td className="whitespace-nowrap px-3 py-3 align-middle text-right">
        <AppointmentAction
          appointment={appointment}
          nameSlug={nameSlug}
        />
      </td>
    </motion.tr>
  );
}

export function AppointmentsTable({
  appointments,
  onOpen,
  emptyMessage,
  relativeLabel,
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCheck className="h-5 w-5" />
        </div>

        <div className="mt-3 text-sm font-semibold text-slate-900">
          You&apos;re all caught up
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {emptyMessage ||
            "No appointments match this filter."}
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]"
      data-testid="needs-attention-queue"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th
                aria-hidden
                className="w-1 p-0"
              />

              <Th>Job ID</Th>
              <Th>Customer</Th>
              <Th>Phone</Th>
              <Th>Service</Th>
              <Th>Window</Th>
              <Th>Tech</Th>
              <Th>Status</Th>
              <Th>Customer reply</Th>
              <Th className="text-right">
                Action
              </Th>
            </tr>
          </thead>

          <tbody>
            <AnimatePresence initial={false}>
              {appointments.map(
                (appointment, index) => (
                  <Row
                    key={appointment.id}
                    appointment={appointment}
                    onOpen={onOpen}
                    index={index}
                    relativeLabel={relativeLabel}
                  />
                )
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500",
        className
      )}
    >
      {children}
    </th>
  );
}