const fs = require("fs");
const path = require("path");
const { openDb, dbPath } = require("./db");

const appointmentsPath = path.join(
  __dirname,
  "..",
  "automation",
  "data",
  "appointments.json"
);

const db = openDb();
const appointments = JSON.parse(fs.readFileSync(appointmentsPath, "utf8"));

const insert = db.prepare(`
  INSERT OR REPLACE INTO appointments (
    job_id,
    customer_name,
    phone,
    address,
    service,
    window,
    technician,
    notes,
    status,
    requires_attention,
    created_at,
    updated_at
  )
  VALUES (
    @job_id,
    @customer_name,
    @phone,
    @address,
    @service,
    @window,
    @technician,
    @notes,
    @status,
    @requires_attention,
    @created_at,
    @updated_at
  )
`);

const seedAppointments = db.transaction((records) => {
  for (const appointment of records) {
    const now = new Date().toISOString();

    insert.run({
      job_id: String(appointment.job_id),
      customer_name: appointment.customer_name,
      phone: appointment.phone || null,
      address: appointment.address || null,
      service: appointment.service || null,
      window: appointment.window || null,
      technician: appointment.technician || null,
      notes: appointment.notes || null,

      // These are upcoming appointments from the mocked ServiceTitan boundary.
      // No confirmation has happened yet.
      status: "PENDING",
      requires_attention: 0,

      created_at: now,
      updated_at: now,
    });
  }
});

seedAppointments(appointments);

console.log(`Seeded ${appointments.length} appointments into SQLite.`);

const rows = db
  .prepare(`
    SELECT job_id, customer_name, service, window, status
    FROM appointments
    ORDER BY job_id
  `)
  .all();

console.table(rows);

db.close();