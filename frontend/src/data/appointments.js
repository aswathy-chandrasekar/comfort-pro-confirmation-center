// ------------------------------------------------------------------
// Static UI metadata and date helpers for the Confirmation Center.
// Appointment data is NOT defined here: it comes from the backend API
// (see context/AppContext.jsx), which is populated by the automation engine.
// ------------------------------------------------------------------

export const APP_META = {
  companyName: "Comfort Pro",
  companyFull: "Heating, Air & Plumbing",
  productName: "Confirmation Center",
  currentUser: {
    name: "Linda Ortiz",
    role: "Dispatcher",
    initials: "LO",
    email: "linda@comfortpro.com",
  },
};

// ---------- date helpers -------------------------------------------
export function isoDate(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function addDays(iso, delta) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShort(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function formatLong(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function relativeLabel(selectedIso, todayIso) {
  if (selectedIso === todayIso) return "Today";
  if (selectedIso === addDays(todayIso, 1)) return "Tomorrow";
  if (selectedIso === addDays(todayIso, -1)) return "Yesterday";
  return formatShort(selectedIso);
}

export function weekdayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
}

export function getActivityForDate(iso, appointments) {
  const count = appointments.length;
  const events = [
    { time: "5:00 PM", title: `${count} confirmation messages sent`, subtitle: `Batch dispatch for ${formatShort(iso)} confirmations`, tone: "neutral" },
  ];
  appointments.forEach((a) => {
    if (a.status === "confirmed" && a.customerReply) {
      events.push({
        time: a.customerReply.time,
        title: `${a.customerName} confirmed`,
        subtitle: a.automation.processedUsing === "exact_rule" ? "Exact confirmation" : "Natural language confirmation",
        tone: "success",
      });
    } else if (a.status === "schedule_change") {
      events.push({
        time: a.customerReply?.time || "5:14 PM",
        title: `${a.customerName} requested a schedule change`,
        subtitle: "Sent to dispatcher review",
        tone: "warning",
      });
    } else if (a.status === "question") {
      events.push({
        time: a.customerReply?.time || "5:18 PM",
        title: `${a.customerName} asked a question`,
        subtitle: "Sent to dispatcher review",
        tone: "info",
      });
    } else if (a.status === "no_response") {
      events.push({
        time: "5:30 PM",
        title: `${a.customerName} reached response checkpoint`,
        subtitle: "No response, dispatcher follow-up required",
        tone: "warning",
      });
    }
  });
  // Chronological sort so derived events read in order.
  const toMin = (t) => {
    if (!t) return 0;
    const [hm, ap] = t.split(" ");
    let [h, m] = hm.split(":").map(Number);
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  return events.sort((a, b) => toMin(a.time) - toMin(b.time));
}
