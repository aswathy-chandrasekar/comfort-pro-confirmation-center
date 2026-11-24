import { useEffect, useRef, useState } from "react";
import { FILTERS, countFor, TECHNICIANS, SERVICES, TIME_WINDOWS } from "@/lib/statusConfig";
import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";

const TONE_UNDERLINE = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  default: "bg-blue-600",
};

export function FiltersBar({
  filter,
  setFilter,
  search,
  setSearch,
  appointments,
  advanced,
  setAdvanced,
  clearFilters,
  activeAdvancedCount,
  searchInputRef,
  dateLabel,
  dateWeekday,
  relativeLabel,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filtersOpen]);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]" data-testid="filters-bar">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {relativeLabel}
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span className="font-medium">{dateLabel}</span>
            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-200">
              {dateWeekday}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              data-testid="search-input"
              type="text"
              placeholder="Search customer, job, phone, tech"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="relative" ref={filtersRef}>
            <button
              type="button"
              data-testid="filters-button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all",
                activeAdvancedCount > 0
                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeAdvancedCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9.5px] font-bold text-white">
                  {activeAdvancedCount}
                </span>
              )}
            </button>

            {filtersOpen && (
              <div
                className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)]"
                data-testid="filters-dropdown"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Refine</div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <FilterGroup
                  label="Technician"
                  options={[{ value: "all", label: "All" }, ...TECHNICIANS.map((t) => ({ value: t, label: t }))]}
                  value={advanced.technician}
                  onChange={(v) => setAdvanced({ ...advanced, technician: v })}
                  testIdPrefix="filter-technician"
                />

                <FilterGroup
                  label="Service"
                  options={[{ value: "all", label: "All" }, ...SERVICES.map((s) => ({ value: s, label: s }))]}
                  value={advanced.service}
                  onChange={(v) => setAdvanced({ ...advanced, service: v })}
                  testIdPrefix="filter-service"
                />

                <FilterGroup
                  label="Time window"
                  options={[{ value: "all", label: "All" }, ...TIME_WINDOWS.map((w) => ({ value: w.key, label: w.label }))]}
                  value={advanced.window}
                  onChange={(v) => setAdvanced({ ...advanced, window: v })}
                  testIdPrefix="filter-window"
                />

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-semibold text-slate-500 transition-colors hover:text-slate-800"
                    data-testid="filters-clear"
                  >
                    Clear filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(false)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto px-2">
        {FILTERS.map((f) => {
          const count = countFor(f.key, appointments);
          const active = filter === f.key;
          const underline = TONE_UNDERLINE[f.tone] || TONE_UNDERLINE.default;
          return (
            <button
              key={f.key}
              data-testid={f.testId}
              onClick={() => setFilter(f.key)}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:bg-slate-50",
                active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <span>{f.label}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors",
                  active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                )}
              >
                {count}
              </span>
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-all duration-200",
                  active ? underline : "bg-transparent"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange, testIdPrefix }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              data-testid={`${testIdPrefix}-${o.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              onClick={() => onChange(o.value)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                active
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {active && <Check className="h-3 w-3" strokeWidth={2.6} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
