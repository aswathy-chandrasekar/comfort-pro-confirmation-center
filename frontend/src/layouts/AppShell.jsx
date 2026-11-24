import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  History,
  Calendar as CalendarIcon,
  Flame,
  RefreshCw,
  Menu,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/context/AppContext";
import { useEffect, useRef, useState } from "react";
import { relativeLabel, formatShort } from "@/data/appointments";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, testId: "nav-overview", end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon, testId: "nav-calendar" },
  { to: "/activity", label: "Activity", icon: History, testId: "nav-activity" },
];

function Sidebar({ onNavigate }) {
  const { meta } = useApp();
  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800/70 bg-[#0B1220] text-slate-200">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5" data-testid="sidebar-brand">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-[0_4px_12px_-2px_rgba(37,99,235,0.6)]">
            <Flame className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
              {meta.companyName}
            </div>
            <div className="truncate text-[10px] text-slate-500">{meta.companyFull}</div>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-white/[0.04] px-3 py-2.5 ring-1 ring-inset ring-white/5">
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-slate-500">Product</div>
          <div className="mt-0.5 text-[14px] font-semibold text-white" style={{ fontFamily: "Outfit, Inter, sans-serif" }}>
            {meta.productName}
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            data-testid={item.testId}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                isActive
                  ? "bg-blue-600/20 text-white ring-1 ring-inset ring-blue-500/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-4 w-4", isActive && "text-blue-300")} />
                <span className="flex-1">{item.label}</span>
                {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-blue-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-800/70 px-4 py-4" data-testid="connection-indicator-servicetitan">
        <div className="rounded-lg bg-white/[0.03] px-3 py-2.5 ring-1 ring-inset ring-white/5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
            <span className="text-xs font-medium text-slate-200">ServiceTitan</span>
          </div>
          <div className="mt-1 text-[10px] leading-relaxed text-slate-500">System of record</div>
        </div>
      </div>
    </aside>
  );
}

function formatSecs(sec) {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
// eslint-disable-next-line no-unused-vars
const _unusedFormatSecs = formatSecs;

function CheckpointBadge() {
  return (
    <span className="inline-flex items-center gap-1.5" data-testid="cutoff-countdown">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      <span className="text-[11px] text-slate-500">
        Response checkpoint: <span className="font-mono font-semibold text-slate-700">5:30 PM</span>
      </span>
    </span>
  );
}

function NotificationPanel({ open, onClose, onGoTo, summary, batchLabel }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => panelRef.current && !panelRef.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  if (!open) return null;

  const items = [
    summary.needsAttention > 0 && {
      key: "needs_attention",
      dot: "bg-amber-500",
      title: "Needs Review",
      body: `${summary.needsAttention} appointments require follow-up`,
    },
    summary.scheduleChanges > 0 && {
      key: "schedule_change",
      dot: "bg-amber-500",
      title: "Schedule Change",
      body: `${summary.scheduleChanges} customer${summary.scheduleChanges === 1 ? "" : "s"} requested a different time`,
    },
    summary.questions > 0 && {
      key: "question",
      dot: "bg-sky-500",
      title: "Question",
      body: `${summary.questions} customer${summary.questions === 1 ? "" : "s"} asked a question`,
    },
    summary.noResponse > 0 && {
      key: "no_response",
      dot: "bg-orange-500",
      title: "No Response",
      body: `${summary.noResponse} customer${summary.noResponse === 1 ? " has" : "s have"} not responded`,
    },
  ].filter(Boolean);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)]"
      data-testid="notifications-panel"
    >
      <div className="px-2 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Notifications</div>
        <div className="mt-0.5 text-[11px] text-slate-500">Confirmation batch for {batchLabel}</div>
      </div>
      <div className="mt-1 space-y-0.5">
        {items.length === 0 && (
          <div className="rounded-lg px-3 py-4 text-center text-xs text-slate-500">No exceptions for this batch.</div>
        )}
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            data-testid={`notification-${it.key}`}
            onClick={() => onGoTo(it.key)}
            className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
          >
            <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", it.dot)} />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold text-slate-900">{it.title}</div>
              <div className="mt-0.5 text-[11.5px] text-slate-500">{it.body}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileMenu({ open, onClose, user, onSignOut }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)]"
      data-testid="profile-menu"
    >
      <div className="rounded-lg px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-semibold text-white">
            {user.initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-slate-900" data-testid="profile-name">
              {user.name}
            </div>
            <div className="truncate text-[11px] text-slate-500">{user.role}</div>
          </div>
        </div>
        <div className="mt-2 truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[10.5px] text-slate-600">
          {user.email}
        </div>
      </div>
      <div className="mt-1 border-t border-slate-100 pt-1">
        <button
          type="button"
          data-testid="sign-out-button"
          onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell() {
  const {
    meta,
    lastUpdated,
    refresh,
    selectedDate,
    operatingToday,
    summary,
    setFilter,
    signOut,
  } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const rel = relativeLabel(selectedDate, operatingToday);
  const short = formatShort(selectedDate);

  const pageTitle =
    location.pathname === "/activity"
      ? "Activity"
      : location.pathname === "/calendar"
      ? "Confirmation Calendar"
      : rel === "Today"
      ? "Today's Confirmations"
      : rel === "Tomorrow"
      ? "Tomorrow's Confirmations"
      : rel === "Yesterday"
      ? "Yesterday's Confirmations"
      : `${short} Confirmations`;

  const pageSubtitle =
    location.pathname === "/calendar"
      ? "Daily confirmation status"
      : `${short}, 2026`;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
    refresh();
  };

  const handleNotifyGoTo = (key) => {
    setNotificationsOpen(false);
    if (location.pathname !== "/") navigate("/");
    setFilter(key === "needs_attention" ? "needs_attention" : key);
  };

  const hasExceptions = summary.needsAttention > 0;

  return (
    <div className="flex min-h-screen bg-slate-50/70">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-in slide-in-from-left duration-200">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden h-9 items-center justify-between border-b border-slate-200/70 bg-white px-8 text-[11px] text-slate-500 lg:flex">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems normal
            </span>
            <span className="text-slate-300">·</span>
            <CheckpointBadge />
          </div>
          <div className="flex items-center gap-4">
            <span>Central Time</span>
          </div>
        </div>

        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur lg:px-8"
          data-testid="app-header"
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              data-testid="mobile-nav-toggle"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1
                data-testid="header-title"
                className="truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                style={{ fontFamily: "Outfit, Inter, sans-serif" }}
              >
                {pageTitle}
              </h1>
              <div className="truncate text-xs text-slate-500">{pageSubtitle}</div>
            </div>
          </div>

          <div className="hidden flex-1 justify-center px-8 md:flex">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                readOnly
                placeholder="Search appointments, jobs, technicians"
                onFocus={(e) => {
                  e.currentTarget.blur();
                  if (location.pathname !== "/") navigate("/");
                  setTimeout(() => document.querySelector('[data-testid="search-input"]')?.focus(), 50);
                }}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-xs text-slate-600 placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                Ctrl /
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="hidden text-xs text-slate-500 lg:inline" data-testid="last-updated">
              Last updated {lastUpdated}
            </span>
            <button
              type="button"
              data-testid="header-refresh-button"
              onClick={handleRefresh}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4 transition-transform", refreshing && "motion-safe:animate-spin")} />
            </button>

            <div className="relative">
              <button
                type="button"
                data-testid="notifications-button"
                onClick={() => {
                  setNotificationsOpen((v) => !v);
                  setProfileOpen(false);
                }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {hasExceptions && (
                  <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                )}
              </button>
              <NotificationPanel
                open={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                onGoTo={handleNotifyGoTo}
                summary={summary}
                batchLabel={short}
              />
            </div>

            <div className="relative">
              <button
                type="button"
                data-testid="dispatcher-avatar"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotificationsOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-2"
                title={meta.currentUser.name}
                aria-label="Open profile menu"
              >
                {meta.currentUser.initials}
              </button>
              <ProfileMenu
                open={profileOpen}
                onClose={() => setProfileOpen(false)}
                user={meta.currentUser}
                onSignOut={() => {
                  setProfileOpen(false);
                  signOut();
                }}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
