import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";

import {
  APP_META,
  getActivityForDate,
} from "@/data/appointments";

const AppContext = createContext(null);

const API_BASE = "http://localhost:4000/api";

/*
 * The live confirmation queue always represents tomorrow's
 * appointment batch.
 *
 * We intentionally build YYYY-MM-DD using local time rather than
 * toISOString(), because UTC conversion can shift the date when
 * the application is used late in the evening.
 */
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return getLocalDateString(new Date());
}

function getTomorrowDate() {
  const today = new Date();
  const tomorrow = new Date(today);

  tomorrow.setDate(today.getDate() + 1);

  return getLocalDateString(tomorrow);
}

const TODAY_DATE = getTodayDate();
const LIVE_DATE = getTomorrowDate();

const DEFAULT_FILTERS = {
  technician: "all",
  service: "all",
  window: "all",
};

function nowClock() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;

  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatWindow(window) {
  const map = {
    "8-10": {
      window: "8:00 AM to 10:00 AM",
      windowShort: "8-10a",
    },
    "10-12": {
      window: "10:00 AM to 12:00 PM",
      windowShort: "10-12p",
    },
    "12-2": {
      window: "12:00 PM to 2:00 PM",
      windowShort: "12-2p",
    },
    "2-4": {
      window: "2:00 PM to 4:00 PM",
      windowShort: "2-4p",
    },
    "4-6": {
      window: "4:00 PM to 6:00 PM",
      windowShort: "4-6p",
    },
  };

  return (
    map[window] || {
      window: window || "",
      windowShort: window || "",
    }
  );
}

function formatReplyTime(timestamp) {
  if (!timestamp) return "";

  const d = new Date(timestamp);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;

  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function mapStatus(row) {
  switch (row.status) {
    case "CONFIRMED":
      return "confirmed";

    case "NEEDS_RESCHEDULE":
      return "schedule_change";

    case "NEEDS_RESPONSE":
      return "question";

    case "NO_RESPONSE":
      return "no_response";

    case "NEEDS_REVIEW":
      return "needs_review";

    case "PENDING":
    case "PENDING_CONFIRMATION":
    default:
      return "pending";
  }
}

/*
 * The automation engine labels processing as DETERMINISTIC / LLM /
 * NO_RESPONSE. The drawer's presentation layer uses exact_rule / nlp / rule.
 * This is a pure label translation; the decision itself is made upstream.
 */
function mapProcessingMethod(method) {
  switch (method) {
    case "DETERMINISTIC":
      return "exact_rule";
    case "LLM":
      return "nlp";
    case "NO_RESPONSE":
      return "rule";
    default:
      return method || null;
  }
}

function buildTimeline(row, status) {
  const events = [];
  const sent = formatReplyTime(row.outbound_timestamp);
  const replied = formatReplyTime(row.response_timestamp);
  const updated = formatReplyTime(row.updated_at);

  if (row.outbound_timestamp) {
    events.push({ time: sent, event: "Confirmation sent" });
  }

  if (row.customer_reply) {
    events.push({ time: replied, event: "Customer replied" });
  }

  if (status === "confirmed") {
    events.push({
      time: replied || updated,
      event: "Confirmed automatically",
    });
  } else if (status === "schedule_change") {
    events.push({ time: replied, event: "Schedule change detected" });
  } else if (status === "question") {
    events.push({ time: replied, event: "Customer question detected" });
  } else if (status === "needs_review") {
    events.push({
      time: replied || updated,
      event: "Reply could not be classified safely",
    });
  } else if (status === "no_response") {
    events.push({ time: updated, event: "Response checkpoint reached" });
  }

  if (row.requires_attention) {
    events.push({
      time: replied || updated,
      event: "Added to dispatcher review",
    });
  }

  return events;
}

function mapApiAppointment(row) {
  const formattedWindow = formatWindow(row.window);
  const status = mapStatus(row);

  let recommendedAction = null;
  let resultMessage = null;
  let resultNote = null;

  if (status === "confirmed") {
    resultMessage = "Appointment confirmed";
  } else if (status === "schedule_change") {
    recommendedAction = "Review requested time change";
    resultMessage = "Schedule change detected";
    resultNote = "No schedule change was made automatically.";
  } else if (status === "question") {
    recommendedAction = "Respond to customer";
    resultMessage = "Customer question detected";
    resultNote = "Customer response requires dispatcher review.";
  } else if (status === "no_response") {
    recommendedAction = "Call customer";
    resultMessage = "No response received";
    resultNote = "Customer follow-up required.";
  } else if (status === "needs_review") {
    recommendedAction = "Review customer response";
    resultMessage = "Customer response needs review";
    resultNote =
      row.escalation_reason ||
      "Automation did not take a business action.";
  } else {
    /*
     * Pending is not the same as no response.
     * The customer simply has not completed the confirmation flow yet.
     */
    recommendedAction = null;
    resultMessage = "Awaiting customer confirmation";
    resultNote = null;
  }

  return {
    id: String(row.job_id),
    customerName: row.customer_name,
    phone: row.phone || "",
    address: row.address || "",
    service: row.service || "",
    window: formattedWindow.window,
    windowShort: formattedWindow.windowShort,
    windowKey: row.window || "",
    technician: row.technician || "",
    serviceNote: row.notes || "",

    status,

    customerReply: row.customer_reply
      ? {
          time: formatReplyTime(row.response_timestamp),
          body: row.customer_reply,
        }
      : null,

    recommendedAction:
      row.suggested_action || recommendedAction,

    resultMessage,

    /*
     * The schedule-change safety note must always be shown verbatim, so it is
     * never replaced by the classifier summary.
     */
    resultNote:
      status === "schedule_change"
        ? resultNote
        : row.escalation_reason ||
          row.classifier_summary ||
          resultNote,

    automation: {
      processedUsing: mapProcessingMethod(row.processing_method),
      intent: row.detected_intent || null,
      confidence: row.confidence ?? null,
    },

    timeline: buildTimeline(row, status),

    confirmationSent: {
      time: formatReplyTime(row.outbound_timestamp),
      body:
        row.outbound_message ||
        "Confirmation message has not been sent yet.",
    },

    deliveryStatus: row.delivery_status || null,
    outboundMessage: row.outbound_message || null,
    outboundMessageId: row.outbound_message_id || null,
    outboundTimestamp: row.outbound_timestamp || null,
    responseTimestamp: row.response_timestamp || null,

    /*
     * Backend business rules are the source of truth.
     * Pending appointments must not automatically become review items.
     */
    needsAttention: Boolean(row.requires_attention),

    source: "live_api",
  };
}

export function AppProvider({ children }) {
  /*
   * Open directly on tomorrow's live confirmation batch.
   */
  const [selectedDate, setSelectedDate] = useState(LIVE_DATE);

  const [liveAppointments, setLiveAppointments] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(null);

  const [reviewedIds, setReviewedIds] = useState({});
  const [filter, setFilter] = useState("needs_attention");
  const [search, setSearch] = useState("");
  const [advanced, setAdvanced] = useState(DEFAULT_FILTERS);
  const [lastUpdated, setLastUpdated] = useState(nowClock());
  const [signedIn, setSignedIn] = useState(false);

  const fetchLiveAppointments = useCallback(async () => {
    try {
      setLiveError(null);

      const response = await fetch(`${API_BASE}/appointments`);

      if (!response.ok) {
        throw new Error(
          `Backend returned HTTP ${response.status}`
        );
      }

      const rows = await response.json();

      const mapped = rows
        .map(mapApiAppointment)
        .sort((a, b) => {
          const order = {
            "8-10": 1,
            "10-12": 2,
            "12-2": 3,
            "2-4": 4,
            "4-6": 5,
          };

          const windowDiff =
            (order[a.windowKey] || 99) -
            (order[b.windowKey] || 99);

          if (windowDiff !== 0) {
            return windowDiff;
          }

          return Number(a.id) - Number(b.id);
        });

      setLiveAppointments(mapped);
      setLastUpdated(nowClock());
    } catch (error) {
      console.error(
        "Failed to load live appointments:",
        error
      );

      setLiveError(error.message);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveAppointments();

    const interval = setInterval(() => {
      fetchLiveAppointments();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchLiveAppointments]);

  /*
   * Only tomorrow has a live appointment batch.
   *
   * Other dates intentionally return no appointments instead of
   * loading historical/future fixture batches.
   */
  const appointments = useMemo(() => {
    const list =
      selectedDate === LIVE_DATE
        ? liveAppointments
        : [];

    const reviewedForDate =
      reviewedIds[selectedDate] || {};

    return list.map((a) => ({
      ...a,

      /*
       * Preserve the backend-derived attention state.
       * Do not classify pending appointments as exceptions.
       */
      needsAttention: Boolean(a.needsAttention),

      reviewed: !!reviewedForDate[a.id],
    }));
  }, [
    selectedDate,
    liveAppointments,
    reviewedIds,
  ]);

  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    setSelectedId(null);
  }, [selectedDate]);

  const markReviewed = useCallback(
    (id) => {
      setReviewedIds((prev) => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          [id]: true,
        },
      }));
    },
    [selectedDate]
  );

  const undoReviewed = useCallback(
    (id) => {
      setReviewedIds((prev) => {
        const forDate = {
          ...(prev[selectedDate] || {}),
        };

        delete forDate[id];

        return {
          ...prev,
          [selectedDate]: forDate,
        };
      });
    },
    [selectedDate]
  );

  const summary = useMemo(() => {
    const total = appointments.length;

    const confirmed = appointments.filter(
      (a) => a.status === "confirmed"
    ).length;

    const needsAttention = appointments.filter(
      (a) =>
        a.needsAttention &&
        !a.reviewed
    ).length;

    const scheduleChanges = appointments.filter(
      (a) => a.status === "schedule_change"
    ).length;

    const questions = appointments.filter(
      (a) => a.status === "question"
    ).length;

    const noResponse = appointments.filter(
      (a) => a.status === "no_response"
    ).length;

    return {
      total,
      confirmed,
      needsAttention,
      scheduleChanges,
      questions,
      noResponse,
      automationRate:
        total > 0
          ? Math.round((confirmed / total) * 100)
          : 0,
    };
  }, [appointments]);

  const activity = useMemo(
    () =>
      getActivityForDate(
        selectedDate,
        appointments
      ),
    [selectedDate, appointments]
  );

  const selected = useMemo(
    () =>
      appointments.find(
        (a) => a.id === selectedId
      ) || null,
    [appointments, selectedId]
  );

  const refresh = useCallback(() => {
    fetchLiveAppointments();
  }, [fetchLiveAppointments]);

  const goToDate = useCallback((iso) => {
    setSelectedDate(iso);
    setFilter("needs_attention");
    setSearch("");
    setAdvanced(DEFAULT_FILTERS);
  }, []);

  const clearFilters = useCallback(() => {
    setAdvanced(DEFAULT_FILTERS);
  }, []);

  const activeAdvancedCount = useMemo(
    () =>
      Object.values(advanced).filter(
        (v) => v !== "all"
      ).length,
    [advanced]
  );

  const signOut = useCallback(
    () => setSignedIn(false),
    []
  );

  const signIn = useCallback(
    () => setSignedIn(true),
    []
  );

  const value = {
    meta: APP_META,

    /*
     * Dynamic dates exposed to the UI.
     */
    operatingToday: TODAY_DATE,
    liveDate: LIVE_DATE,

    selectedDate,
    setSelectedDate: goToDate,

    appointments,
    activity,
    summary,

    liveLoading,
    liveError,

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

    lastUpdated,
    refresh,

    signedIn,
    signIn,
    signOut,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);

  if (!ctx) {
    throw new Error(
      "useApp must be used within AppProvider"
    );
  }

  return ctx;
}