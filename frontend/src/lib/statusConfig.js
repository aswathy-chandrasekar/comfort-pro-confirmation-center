// Central status semantic mapping. All badges, dots, and row indicators derive from this.
export const STATUS_CONFIG = {
  confirmed: {
    key: "confirmed",
    label: "Confirmed",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    stripe: "bg-emerald-500",
  },
  schedule_change: {
    key: "schedule_change",
    label: "Schedule change",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
    stripe: "bg-amber-500",
  },
  question: {
    key: "question",
    label: "Question",
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
    stripe: "bg-sky-500",
  },
  no_response: {
    key: "no_response",
    label: "No response",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-600/20",
    stripe: "bg-orange-500",
  },
  needs_review: {
    // Reserved for genuinely ambiguous/uncertain automation outcomes
    // (cancellation requests, low-confidence AI results, model/API
    // failures) - distinct from the routine exception categories above.
    // This slot was already anticipated in design_guidelines.json's
    // "manual_review" entry but never wired up; completed here rather
    // than introduced fresh.
    key: "needs_review",
    label: "Needs review",
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-600/20",
    stripe: "bg-rose-500",
  },
};

export const FILTERS = [
  { key: "all", label: "All", testId: "filter-chip-all" },
  { key: "needs_attention", label: "Needs Review", testId: "filter-chip-needs-attention", tone: "amber" },
  { key: "confirmed", label: "Confirmed", testId: "filter-chip-confirmed", tone: "emerald" },
  { key: "schedule_change", label: "Schedule Changes", testId: "filter-chip-schedule-changes", tone: "amber" },
  { key: "question", label: "Questions", testId: "filter-chip-questions", tone: "sky" },
  { key: "no_response", label: "No Response", testId: "filter-chip-no-response", tone: "orange" },
  { key: "needs_review", label: "Ambiguous / Other", testId: "filter-chip-needs-review", tone: "rose" },
];

export function countFor(filterKey, appointments) {
  if (filterKey === "all") return appointments.length;
  if (filterKey === "needs_attention") return appointments.filter((a) => a.needsAttention && !a.reviewed).length;
  if (filterKey === "confirmed") return appointments.filter((a) => a.status === "confirmed").length;
  return appointments.filter((a) => a.status === filterKey).length;
}

export const TECHNICIANS = ["Derek", "Luis", "Carlos"];
export const SERVICES = [
  "AC Maintenance",
  "AC Repair",
  "Plumbing Repair",
  "AC Install Estimate",
  "Water Heater",
  "Drain Cleaning",
];
export const TIME_WINDOWS = [
  { key: "8-10", label: "8 AM to 10 AM" },
  { key: "10-12", label: "10 AM to 12 PM" },
  { key: "12-2", label: "12 PM to 2 PM" },
  { key: "2-4", label: "2 PM to 4 PM" },
  { key: "4-6", label: "4 PM to 6 PM" },
];
