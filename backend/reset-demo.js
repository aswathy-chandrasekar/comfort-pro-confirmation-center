const { openDb, dbPath } = require("./db");
const path = require("path");

const db = openDb();

const resetDemo = db.transaction(() => {
  // Clear webhook idempotency history
  db.prepare("DELETE FROM processed_events").run();

  // Clear audit history
  db.prepare("DELETE FROM audit_events").run();

  // Reset appointment workflow state while preserving
  // the original appointment/customer information
  db.prepare(`
    UPDATE appointments
    SET
      status = 'PENDING',
      outbound_message = NULL,
      outbound_message_id = NULL,
      outbound_timestamp = NULL,
      delivery_status = NULL,
      customer_reply = NULL,
      response_timestamp = NULL,
      processing_method = NULL,
      detected_intent = NULL,
      confidence = NULL,
      classifier_summary = NULL,
      requires_attention = 0,
      suggested_action = NULL,
      escalation_reason = NULL,
      updated_at = ?
  `).run(new Date().toISOString());
});

try {
  resetDemo();

  const appointmentCount = db
    .prepare("SELECT COUNT(*) AS count FROM appointments")
    .get().count;

  const pendingCount = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM appointments
      WHERE status = 'PENDING'
    `)
    .get().count;

  const processedEventCount = db
    .prepare("SELECT COUNT(*) AS count FROM processed_events")
    .get().count;

  const auditCount = db
    .prepare("SELECT COUNT(*) AS count FROM audit_events")
    .get().count;

  console.log("");
  console.log("Comfort Pro demo reset complete.");
  console.log("--------------------------------");
  console.log(`Appointments:     ${appointmentCount}`);
  console.log(`Pending:          ${pendingCount}`);
  console.log(`Processed events: ${processedEventCount}`);
  console.log(`Audit events:     ${auditCount}`);
  console.log("--------------------------------");
  console.log("Demo environment is ready.");
  console.log("");
} catch (error) {
  console.error("Demo reset failed:");
  console.error(error);
  process.exitCode = 1;
} finally {
  db.close();
}