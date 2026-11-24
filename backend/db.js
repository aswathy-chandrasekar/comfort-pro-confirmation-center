const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.COMFORT_PRO_DB || path.join(__dirname, "comfort_pro.db");

/*
 * Opens the SQLite database and makes sure the tables exist.
 * Shared by the server, seed.js and reset-demo.js so they can be run in any order.
 */
function openDb() {
  const db = new Database(dbPath);
  db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    job_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    service TEXT,
    window TEXT,
    technician TEXT,
    notes TEXT,

    status TEXT NOT NULL DEFAULT 'PENDING',

    outbound_message TEXT,
    outbound_message_id TEXT,
    outbound_timestamp TEXT,
    delivery_status TEXT,

    customer_reply TEXT,
    response_timestamp TEXT,

    processing_method TEXT,
    detected_intent TEXT,
    confidence REAL,
    classifier_summary TEXT,

    requires_attention INTEGER DEFAULT 0,
    suggested_action TEXT,
    escalation_reason TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    job_id TEXT,
    received_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    event_type TEXT NOT NULL,
    detail TEXT,
    created_at TEXT NOT NULL
  );
`);
  return db;
}

module.exports = { openDb, dbPath };
