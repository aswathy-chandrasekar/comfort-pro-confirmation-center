const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Persistent SQLite database (schema lives in db.js)
const { openDb, dbPath } = require("./db");
const db = openDb();

// --------------------------------------------------
// HEALTH
// --------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Comfort Pro Live Prototype",
    database: "connected",
  });
});

// --------------------------------------------------
// EVENT IDEMPOTENCY
// --------------------------------------------------

// Claim an inbound event exactly once.
// First request with an event_id:
//   duplicate = false
//   claimed = true
//
// Repeated request with the same event_id:
//   duplicate = true
//   claimed = false
app.post("/api/events/claim", (req, res) => {
  try {
    const { event_id, job_id } = req.body;

    if (!event_id || !job_id) {
      return res.status(400).json({
        success: false,
        error: "event_id and job_id are required",
      });
    }

    const receivedAt = new Date().toISOString();

    const result = db
      .prepare(`
        INSERT OR IGNORE INTO processed_events (
          event_id,
          job_id,
          received_at
        )
        VALUES (?, ?, ?)
      `)
      .run(
        String(event_id),
        String(job_id),
        receivedAt
      );

    const duplicate = result.changes === 0;

    res.json({
      success: true,
      event_id: String(event_id),
      job_id: String(job_id),
      duplicate,
      claimed: !duplicate,
    });
  } catch (error) {
    console.error("Event claim failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to claim event",
    });
  }
});

// --------------------------------------------------
// APPOINTMENTS
// --------------------------------------------------

// Get all appointments
app.get("/api/appointments", (req, res) => {
  const appointments = db
    .prepare("SELECT * FROM appointments ORDER BY window, job_id")
    .all();

  res.json(appointments);
});

// Get one appointment
app.get("/api/appointments/:jobId", (req, res) => {
  const appointment = db
    .prepare("SELECT * FROM appointments WHERE job_id = ?")
    .get(req.params.jobId);

  if (!appointment) {
    return res.status(404).json({
      error: "Appointment not found",
    });
  }

  res.json(appointment);
});

// Update an appointment
app.patch("/api/appointments/:jobId", (req, res) => {
  try {
    const { jobId } = req.params;

    const existing = db
      .prepare("SELECT * FROM appointments WHERE job_id = ?")
      .get(jobId);

    if (!existing) {
      return res.status(404).json({
        error: "Appointment not found",
      });
    }

    // Only these fields may be changed through this endpoint.
    // Core ServiceTitan appointment data stays protected.
    const allowedFields = [
      "status",
      "outbound_message",
      "outbound_message_id",
      "outbound_timestamp",
      "delivery_status",
      "customer_reply",
      "response_timestamp",
      "processing_method",
      "detected_intent",
      "confidence",
      "classifier_summary",
      "requires_attention",
      "suggested_action",
      "escalation_reason",
    ];

    const ALLOWED_STATUSES = [
      "PENDING",
      "CONFIRMED",
      "NEEDS_RESCHEDULE",
      "NEEDS_RESPONSE",
      "NEEDS_REVIEW",
      "NO_RESPONSE",
    ];

    if (
      Object.prototype.hasOwnProperty.call(req.body, "status") &&
      !ALLOWED_STATUSES.includes(req.body.status)
    ) {
      return res.status(400).json({
        error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const updates = [];
    const values = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          field
        )
      ) {
        updates.push(`${field} = @${field}`);

        // SQLite cannot bind JavaScript booleans directly.
        // Convert them to 1 or 0 if one is received.
        if (typeof req.body[field] === "boolean") {
          values[field] = req.body[field] ? 1 : 0;
        } else {
          values[field] = req.body[field];
        }
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "No valid fields supplied",
      });
    }

    const updatedAt = new Date().toISOString();

    updates.push("updated_at = @updated_at");

    values.updated_at = updatedAt;
    values.job_id = jobId;

    db.prepare(`
      UPDATE appointments
      SET ${updates.join(", ")}
      WHERE job_id = @job_id
    `).run(values);

    // Record the change in the audit trail
    db.prepare(`
      INSERT INTO audit_events (
        job_id,
        event_type,
        detail,
        created_at
      )
      VALUES (?, ?, ?, ?)
    `).run(
      jobId,
      "APPOINTMENT_UPDATED",
      JSON.stringify(req.body),
      updatedAt
    );

    const updated = db
      .prepare("SELECT * FROM appointments WHERE job_id = ?")
      .get(jobId);

    res.json({
      success: true,
      appointment: updated,
    });
  } catch (error) {
    console.error("Appointment update failed:", error);

    res.status(500).json({
      error: "Failed to update appointment",
    });
  }
});

// --------------------------------------------------
// AUDIT TRAIL
// --------------------------------------------------

app.get("/api/audit", (req, res) => {
  const events = db
    .prepare(
      "SELECT * FROM audit_events ORDER BY id DESC"
    )
    .all();

  res.json(events);
});

// --------------------------------------------------
// SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Comfort Pro backend running at http://localhost:${PORT}`
  );

  console.log(`Database: ${dbPath}`);
});