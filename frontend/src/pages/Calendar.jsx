import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonth(year, month) {
  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function isoDate(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function formatMonthLabel(year, month) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function Calendar() {
  const navigate = useNavigate();

  const {
    setSelectedDate,
    operatingToday,
    liveDate,
    summary,
  } = useApp();

  /*
   * The calendar follows the current local month rather than
   * being permanently hard-coded to September 2026.
   */
  const currentDate = new Date(
    `${operatingToday}T12:00:00`
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const cells = useMemo(
    () => buildMonth(year, month),
    [year, month]
  );

  const monthLabel = formatMonthLabel(year, month);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">
            Daily confirmation status. Select tomorrow's batch to
            open its confirmation queue.
          </p>
        </div>

        <div className="inline-flex items-center gap-3 text-[12px] text-slate-600">
          <Legend
            swatch="bg-emerald-500"
            label="Confirmed"
          />
          <Legend
            swatch="bg-amber-500"
            label="Needs review"
          />
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)]"
        data-testid="calendar-grid"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3
            className="text-sm font-semibold text-slate-900"
            style={{
              fontFamily: "Outfit, Inter, sans-serif",
            }}
          >
            {monthLabel}
          </h3>

          <div className="text-[11px] text-slate-500">
            Confirmation status per day
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, index) => {
            if (day == null) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[104px] border-b border-r border-slate-100 bg-slate-50/40"
                />
              );
            }

            const key = isoDate(year, month, day);

            const isToday = key === operatingToday;
            const isTomorrow = key === liveDate;

            /*
             * Only tomorrow represents the live confirmation batch.
             * All other dates intentionally show no batch.
             */
            const data = isTomorrow
              ? {
                  total: summary.total,
                  confirmed: summary.confirmed,
                  review: summary.needsAttention,
                }
              : null;

            const canOpenBatch =
              isTomorrow && data && data.total > 0;

            const confirmationRate =
              data && data.total > 0
                ? Math.round(
                    (data.confirmed / data.total) * 100
                  )
                : 0;

            return (
              <button
                key={key}
                type="button"
                data-testid={`calendar-day-${day}`}
                onClick={() => {
                  if (!canOpenBatch) {
                    return;
                  }

                  setSelectedDate(liveDate);
                  navigate("/");
                }}
                className={cn(
                  "min-h-[104px] border-b border-r border-slate-100 p-2.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400",

                  canOpenBatch
                    ? "cursor-pointer hover:bg-blue-50/40 motion-safe:hover:-translate-y-[1px]"
                    : "cursor-default",

                  isToday &&
                    "bg-blue-50/40 ring-1 ring-inset ring-blue-300",

                  isTomorrow &&
                    !isToday &&
                    "bg-slate-50/30"
                )}
                disabled={!canOpenBatch}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-[24px] items-center justify-center rounded-md text-[12px] font-semibold tabular-nums",

                      isToday
                        ? "bg-blue-600 px-1.5 text-white"
                        : "text-slate-700"
                    )}
                  >
                    {day}
                  </span>

                  {isToday && (
                    <span className="rounded-md bg-blue-600/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700">
                      Today
                    </span>
                  )}

                  {isTomorrow && !isToday && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                      Tomorrow
                    </span>
                  )}
                </div>

                {data ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-[10.5px] font-medium text-slate-600">
                      {data.total} appointments
                    </div>

                    <div className="flex items-center gap-2 text-[10.5px]">
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {data.confirmed} confirmed
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10.5px]">
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {data.review} review
                      </span>
                    </div>

                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                        style={{
                          width: `${confirmationRate}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[10.5px] text-slate-400">
                    No batch
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        Calendar shows confirmation status only. Scheduling and
        dispatch remain in ServiceTitan.
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          swatch
        )}
      />
      <span>{label}</span>
    </span>
  );
}