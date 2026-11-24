import { useEffect, useMemo, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { SummaryMetrics } from "@/components/SummaryMetrics";
import { FiltersBar } from "@/components/FiltersBar";
import { AppointmentsTable } from "@/components/AppointmentsTable";
import { AppointmentDetailDrawer } from "@/components/AppointmentDetailDrawer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatShort, relativeLabel, formatLong, weekdayLabel } from "@/data/appointments";

function applyFilters(appointments, filter, search, advanced) {
  const q = search.trim().toLowerCase();
  let list = appointments;
  if (filter === "needs_attention") list = list.filter((a) => a.needsAttention && !a.reviewed);
  else if (filter === "confirmed") list = list.filter((a) => a.status === "confirmed");
  else if (filter !== "all") list = list.filter((a) => a.status === filter);

  if (advanced.technician !== "all") list = list.filter((a) => a.technician === advanced.technician);
  if (advanced.service !== "all") list = list.filter((a) => a.service === advanced.service);
  if (advanced.window !== "all") list = list.filter((a) => a.windowKey === advanced.window);

  if (q) {
    list = list.filter((a) => {
      const digits = q.replace(/\D/g, "");
      const phoneMatch = digits.length >= 3 && a.phone.replace(/\D/g, "").includes(digits);
      return (
        a.customerName.toLowerCase().includes(q) ||
        a.service.toLowerCase().includes(q) ||
        a.technician.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.status || "").replace("_", " ").includes(q) ||
        phoneMatch
      );
    });
  }
  return list;
}

function DateNavigator({ selectedDate, setSelectedDate }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <button
        type="button"
        data-testid="date-prev"
        onClick={() => setSelectedDate(addDays(selectedDate, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-l-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="border-x border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-800" data-testid="date-label">
        {formatLong(selectedDate)}
      </div>
      <button
        type="button"
        data-testid="date-next"
        onClick={() => setSelectedDate(addDays(selectedDate, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
        aria-label="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

const TITLES = {
  all: { title: "All appointments", sub: (s) => `${s.total} scheduled. ${s.needsAttention} need review.` },
  needs_attention: { title: "Needs review", sub: (s) => `${s.needsAttention} appointments require customer follow-up.` },
  confirmed: { title: "Confirmed", sub: (s) => `${s.confirmed} appointments automatically resolved.` },
  schedule_change: { title: "Schedule change requests", sub: () => "Customers who requested a different time." },
  question: { title: "Customer questions", sub: () => "Customers who asked a question needing a reply." },
  no_response: { title: "No customer response", sub: () => "Customers who did not reply before the 5:30 PM response checkpoint." },
};

export default function Overview() {
  const {
    appointments,
    summary,
    filter,
    setFilter,
    search,
    setSearch,
    advanced,
    setAdvanced,
    clearFilters,
    activeAdvancedCount,
    selectedId,
    setSelectedId,
    selected,
    markReviewed,
    undoReviewed,
    selectedDate,
    setSelectedDate,
    operatingToday,
  } = useApp();

  const searchInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(
    () => applyFilters(appointments, filter, search, advanced),
    [appointments, filter, search, advanced]
  );

  const sorted = useMemo(() => {
    const order = { schedule_change: 0, question: 1, no_response: 2, confirmed: 3 };
    return [...filtered].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  }, [filtered]);

  const meta = TITLES[filter] || TITLES.all;
  const relative = relativeLabel(selectedDate, operatingToday);
  const shortLabel = formatShort(selectedDate);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <SummaryMetrics
        summary={summary}
        batchLabel={shortLabel}
        activeFilter={filter}
        onFilterChange={setFilter}
      />

      <div>
        <FiltersBar
          filter={filter}
          setFilter={setFilter}
          search={search}
          setSearch={setSearch}
          appointments={appointments}
          advanced={advanced}
          setAdvanced={setAdvanced}
          clearFilters={clearFilters}
          activeAdvancedCount={activeAdvancedCount}
          searchInputRef={searchInputRef}
          dateLabel={shortLabel}
          dateWeekday={weekdayLabel(selectedDate)}
          relativeLabel={relative}
        />

        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2
                className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                style={{ fontFamily: "Outfit, Inter, sans-serif" }}
                data-testid="queue-title"
              >
                {meta.title}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{meta.sub(summary)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">
                Showing <span className="font-semibold text-slate-800 tabular-nums">{sorted.length}</span> of{" "}
                <span className="tabular-nums">{appointments.length}</span>
              </span>
              <DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            </div>
          </div>

          <AppointmentsTable
            appointments={sorted}
            onOpen={setSelectedId}
            relativeLabel={relative}
            emptyMessage={
              filter === "needs_attention"
                ? "No appointments require review. Every customer replied and is confirmed."
                : "No appointments match your search."
            }
          />

          <div className="mt-3 text-[11px] text-slate-500">
            Automation rate for this batch:{" "}
            <span className="font-semibold text-slate-700 tabular-nums">{summary.automationRate}%</span>
          </div>
        </div>
      </div>

      <AppointmentDetailDrawer
        appointment={selected}
        open={selectedId != null}
        onOpenChange={(v) => !v && setSelectedId(null)}
        onMarkReviewed={markReviewed}
        onUndo={undoReviewed}
      />
    </div>
  );
}
